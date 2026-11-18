#!/usr/bin/env node
/**
 *   npm run dev    → API (port 4000) + interface Vite (port 5173), rechargement automatique
 *   npm start      → compile l'interface puis sert tout sur le port de l'API (mode production)
 *
 * Si backend/.env contient DB_MODE="local", le PostgreSQL portable est démarré
 * automatiquement avant l'application et arrêté avec elle.
 * Ctrl+C arrête tout.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, isLocalMode, readEnv, startLocalPostgres } from './lib/localdb.mjs';

const PROD = process.argv.includes('--prod');
const win = process.platform === 'win32';

if (!fs.existsSync(path.join(ROOT, 'backend', '.env')) || !fs.existsSync(path.join(ROOT, 'frontend', 'node_modules'))) {
  console.error("\n\x1b[31m✖ Projet non installé.\x1b[0m Lancez d'abord : \x1b[1mnpm run setup\x1b[0m\n");
  process.exit(1);
}

const env = readEnv();
let db = null;
let procs = [];
let stopping = false;

async function stopAll(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const p of procs) {
    if (p.exitCode !== null) continue;
    if (win) spawnSync('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore' });
    else p.kill('SIGINT');
  }
  if (db?.started) console.log('\x1b[2m[db] arrêt de PostgreSQL local…\x1b[0m');
  await db?.stop();
  process.exit(code);
}
process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

function launch(name, color, dir, script) {
  const opts = { cwd: path.join(ROOT, dir), shell: win, env: { ...process.env, FORCE_COLOR: '1' } };
  const child = win ? spawn(`npm run ${script}`, opts) : spawn('npm', ['run', script], opts);
  const prefix = `${color}[${name}]\x1b[0m `;
  const pipe = (stream, out) => {
    let buf = '';
    stream.on('data', (d) => {
      buf += d.toString();
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      for (const l of lines) out.write(prefix + l + '\n');
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    if (stopping) return;
    console.log(`${prefix}arrêté (code ${code})`);
    stopAll(code ?? 0);
  });
  return child;
}

if (isLocalMode(env)) {
  try {
    db = await startLocalPostgres({ log: (m) => console.log(`\x1b[35m[db]\x1b[0m ${m}`) });
  } catch (err) {
    console.error(`\x1b[31m✖ PostgreSQL local : ${err.message}\x1b[0m`);
    process.exit(1);
  }
}

if (PROD) {
  console.log('\x1b[2mCompilation de l\'interface…\x1b[0m');
  const build = win
    ? spawnSync('npm run build', { cwd: path.join(ROOT, 'frontend'), stdio: 'inherit', shell: true })
    : spawnSync('npm', ['run', 'build'], { cwd: path.join(ROOT, 'frontend'), stdio: 'inherit' });
  if (build.status !== 0) await stopAll(1);
  procs = [launch('app', '\x1b[34m', 'backend', 'start')];
  console.log(`\n  Application : \x1b[1mhttp://localhost:${env.PORT || 4000}\x1b[0m\n`);
} else {
  procs = [launch('api', '\x1b[34m', 'backend', 'dev'), launch('web', '\x1b[32m', 'frontend', 'dev')];
}
