#!/usr/bin/env node
// Genera ../jaguar-deploy.zip con el código del último commit (git archive HEAD),
// que es lo que se sube en hPanel → Web App Node.js → Redistribuir → Subir archivos nuevos.
// Hostinger corre `npm install` + `npm run build` al recibirlo (confirmado 2026-09-24),
// así que el zip no lleva node_modules/ ni dist/, y nunca lleva .env (está en .gitignore).
import { execSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';

const run = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

const pending = run('git status --porcelain');
if (pending) {
  console.error('Hay cambios sin commitear — el zip solo incluye lo commiteado. Commitea o descarta antes:\n' + pending);
  process.exit(1);
}

const out = resolve('..', 'jaguar-deploy.zip');
run(`git archive --format=zip -o "${out}" HEAD`);
const commit = run('git log -1 --format="%h %s"');
const mb = (statSync(out).size / 1024 / 1024).toFixed(1);
console.log(`Zip listo: ${out} (${mb} MB)\nCommit: ${commit}`);
