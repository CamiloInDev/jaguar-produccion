import { describe, it, expect } from 'vitest';
import * as crypto from 'crypto';
import { decidePaymentTransition } from '../../server/services/paymentRules';
import { verifyWebhookSignature, buildSignatureManifest } from '../../server/services/mercadopago';

const SECRET = 'unit_secret';
const ok = { currency_id: 'COP', transaction_amount: 25000 };

describe('decidePaymentTransition', () => {
  it('approved + matching amount moves pendiente → pagado', () => {
    expect(decidePaymentTransition({ estado: 'pendiente', total: 25000 }, { status: 'approved', ...ok }))
      .toEqual({ next: 'pagado', recordPayment: true });
  });

  it('approved with a different amount or currency changes nothing and raises an alert', () => {
    const wrongAmount = decidePaymentTransition({ estado: 'pendiente', total: 25000 }, { status: 'approved', currency_id: 'COP', transaction_amount: 24999 });
    const wrongCurrency = decidePaymentTransition({ estado: 'pendiente', total: 25000 }, { status: 'approved', currency_id: 'USD', transaction_amount: 25000 });
    for (const d of [wrongAmount, wrongCurrency]) {
      expect(d.next).toBeNull();
      expect(d.recordPayment).toBe(false);
      expect(d.alert).toBeTruthy();
    }
  });

  it('tolerates decimal representation of an exact COP amount', () => {
    expect(decidePaymentTransition({ estado: 'pendiente', total: 25000 }, { status: 'approved', currency_id: 'COP', transaction_amount: 25000.0 }).next).toBe('pagado');
  });

  it('never moves backwards from pagado/enviado/entregado on pending, rejected or in_process', () => {
    for (const estado of ['pagado', 'enviado', 'entregado'] as const) {
      for (const status of ['pending', 'rejected', 'in_process', 'cancelled', 'authorized']) {
        expect(decidePaymentTransition({ estado, total: 25000 }, { status, ...ok }).next).toBeNull();
      }
    }
  });

  it('rejected keeps the order pending so the buyer can retry', () => {
    expect(decidePaymentTransition({ estado: 'pendiente', total: 25000 }, { status: 'rejected', ...ok }).next).toBeNull();
  });

  it('cancelled (expired Efecty coupon) cancels only pending orders', () => {
    expect(decidePaymentTransition({ estado: 'pendiente', total: 25000 }, { status: 'cancelled', ...ok }).next).toBe('cancelado');
  });

  it('refunds/chargebacks cancel paid orders with an alert and only alert on shipped ones', () => {
    const paid = decidePaymentTransition({ estado: 'pagado', total: 25000 }, { status: 'refunded', ...ok });
    expect(paid.next).toBe('cancelado');
    expect(paid.alert).toBeTruthy();
    const shipped = decidePaymentTransition({ estado: 'enviado', total: 25000 }, { status: 'charged_back', ...ok });
    expect(shipped.next).toBeNull();
    expect(shipped.alert).toBeTruthy();
  });

  it('a late approval on a cancelled order is flagged, not silently re-opened', () => {
    const d = decidePaymentTransition({ estado: 'cancelado', total: 25000 }, { status: 'approved', ...ok });
    expect(d.next).toBeNull();
    expect(d.alert).toBeTruthy();
  });
});

describe('verifyWebhookSignature', () => {
  function sign(manifest: string, secret = SECRET) {
    return crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  }

  it('accepts the official manifest id:[data.id];request-id:[x-request-id];ts:[ts];', () => {
    const v1 = sign('id:123456;request-id:bb56a2f1-6aae;ts:1742505638683;');
    expect(verifyWebhookSignature({ xSignature: `ts=1742505638683,v1=${v1}`, xRequestId: 'bb56a2f1-6aae', dataId: '123456', secret: SECRET })).toBe(true);
  });

  it('lowercases alphanumeric data.id as the docs require', () => {
    const v1 = sign('id:ord01jq4s;request-id:r;ts:1;');
    expect(verifyWebhookSignature({ xSignature: `ts=1,v1=${v1}`, xRequestId: 'r', dataId: 'ORD01JQ4S', secret: SECRET })).toBe(true);
  });

  it('omits the pairs whose value is missing', () => {
    expect(buildSignatureManifest('', '', '99')).toBe('ts:99;');
    expect(buildSignatureManifest('5', '', '99')).toBe('id:5;ts:99;');
  });

  it('rejects wrong secret, tampered data.id, missing header and malformed signatures', () => {
    const v1 = sign('id:1;request-id:r;ts:1;');
    expect(verifyWebhookSignature({ xSignature: `ts=1,v1=${v1}`, xRequestId: 'r', dataId: '1', secret: 'otro' })).toBe(false);
    expect(verifyWebhookSignature({ xSignature: `ts=1,v1=${v1}`, xRequestId: 'r', dataId: '2', secret: SECRET })).toBe(false);
    expect(verifyWebhookSignature({ xSignature: undefined, xRequestId: 'r', dataId: '1', secret: SECRET })).toBe(false);
    expect(verifyWebhookSignature({ xSignature: 'v1=abc', xRequestId: 'r', dataId: '1', secret: SECRET })).toBe(false);
    expect(verifyWebhookSignature({ xSignature: 'ts=1,v1=short', xRequestId: 'r', dataId: '1', secret: SECRET })).toBe(false);
  });
});
