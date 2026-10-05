#!/usr/bin/env node
// Genera ../jaguar-deploy.zip, que es lo que se sube en hPanel → Web App Node.js → Redistribuir → Subir archivos nuevos.
// Contenido: el código del último commit (git archive HEAD, respeta .gitignore) + dist/ compilado aquí.
// dist/ es la única excepción al .gitignore: con el preajuste Express, Hostinger solo corre `npm install`
// (Build command: none) y arranca dist/server.cjs, así que tiene que venir compilado en el zip
// (confirmado 2026-10-05: sin dist/ el despliegue falla con "Entry file not found").
// Nunca lleva .env, node_modules/, uploads/ ni nada más de lo ignorado.
import { execSync, execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, posix, resolve } from 'node:path';

const run = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

const pending = run('git status --porcelain');
if (pending) {
  console.error('Hay cambios sin commitear — el zip solo incluye lo commiteado. Commitea o descarta antes:\n' + pending);
  process.exit(1);
}

console.log('Compilando dist/ (npm run build)...');
execSync('npm run build', { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });

// git archive --add-file usa el último --prefix como carpeta destino de cada archivo.
const addArgs = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else addArgs.push(`--prefix=${posix.join(...dir.split(/[\\/]/))}/`, `--add-file=${full}`);
  }
};
walk('dist');

const out = resolve('..', 'jaguar-deploy.zip');
execFileSync('git', ['archive', '--format=zip', '-o', out, ...addArgs, '--prefix=', 'HEAD']);
const commit = run('git log -1 --format="%h %s"');
const mb = (statSync(out).size / 1024 / 1024).toFixed(1);
console.log(`Zip listo: ${out} (${mb} MB, ${addArgs.length / 2} archivos de dist/)\nCommit: ${commit}`);
