#!/usr/bin/env node
/**
 * Mode démonstration « clé en main » — aucun PostgreSQL à installer, aucune configuration.
 *
 *   npm run demo            → démarre (ou reprend) la démo sur http://localhost:4000
 *   npm run demo -- --reset → repart de données de démonstration neuves
 *   npm run demo -- --no-open → n'ouvre pas le navigateur
 *
 * Utilise le PostgreSQL portable (embedded-postgres) avec une base dédiée dans .demo/
 * (port 54330 par défaut), totalement séparée de la configuration backend/.env.
 * Ctrl+C arrête l'application et la base.
 */
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { BACKEND, ROOT, startLocalPostgres } from './lib/localdb.mjs';

const FRONTEND = path.join(ROOT, 'frontend');
const DEMO = path.join(ROOT, '.demo');
const PG_DATA = path.join(DEMO, 'pgdata');
const PG_PORT = Number(process.env.DEMO_PG_PORT) || 54330;
const APP_PORT = Number(process.env.DEMO_PORT) || 4000;
const RESET = process.argv.includes('--reset');
const win = process.platform === 'win32';

const c = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};
const ok = (m) => console.log(`  ${c.green('✔')} ${m}`);
const info = (m) => console.log(`  ${c.cyan('›')} ${m}`);

function run(cmd, args, cwd, env = {}) {
  const opts = { cwd, stdio: 'inherit', shell: win, env: { ...process.env, ...env } };
  const res = win ? spawnSync([cmd, ...args].join(' '), opts) : spawnSync(cmd, args, opts);
  return res.status === 0;
}

let db = null;
let server = null;
let stopping = false;

async function stop(code = 0, message) {
  if (stopping) return;
  stopping = true;
  if (message) console.error(`\n  ${c.red('✖')} ${message}\n`);
  else console.log(`\n  ${c.dim('Arrêt de la démo…')}`);
  if (server && server.exitCode === null) {
    if (win) spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    else server.kill('SIGINT');
  }
  await db?.stop();
  process.exit(code);
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

async function main() {
  console.log(c.bold('\n  Sentinelle — mode démonstration\n'));

  // 1. Dépendances du projet (embedded-postgres est une dépendance du backend)
  for (const [label, dir] of [['backend', BACKEND], ['frontend', FRONTEND]]) {
    if (!fs.existsSync(path.join(dir, 'node_modules')) || (label === 'backend' && !fs.existsSync(path.join(dir, 'node_modules', 'embedded-postgres')))) {
      info(`Installation des dépendances ${label}…`);
      if (!run('npm', ['install', '--no-fund', '--no-audit'], dir)) return stop(1, `npm install a échoué (${label})`);
    }
  }
  ok('Dépendances présentes');

  // 2. PostgreSQL portable dédié à la démo
  if (RESET && fs.existsSync(PG_DATA)) {
    fs.rmSync(PG_DATA, { recursive: true, force: true });
    info('Données de démonstration réinitialisées');
  }
  fs.mkdirSync(DEMO, { recursive: true });
  const databaseUrl = `postgresql://postgres:demo@localhost:${PG_PORT}/sentinelle_demo?schema=public`;
  try {
    // Données de démo jetables : réinitialisées automatiquement si la version de PostgreSQL a changé
    db = await startLocalPostgres({ databaseUrl, dataDir: PG_DATA, log: ok, resetOnVersionMismatch: true });
  } catch (err) {
    return stop(1, `PostgreSQL portable : ${err?.message ?? err}\n    Port occupé ? Essayez : DEMO_PG_PORT=54331 npm run demo`);
  }

  const env = {
    DATABASE_URL: databaseUrl,
    JWT_SECRET: crypto.randomBytes(32).toString('hex'),
    PORT: String(APP_PORT),
    UPLOAD_DIR: path.join(DEMO, 'uploads'),
    NODE_ENV: 'production',
  };

  // 3. Tables + données
  info('Mise à jour du schéma…');
  if (!run('npx', ['prisma', 'migrate', 'deploy'], BACKEND, env)) return stop(1, 'Migrations impossibles');
  if (!run('node', ['prisma/seed.js'], BACKEND, env)) return stop(1, 'Insertion des données impossible');
  ok('Base prête');

  // 4. Interface compilée
  info("Compilation de l'interface…");
  if (!run('npm', ['run', 'build', '--silent'], FRONTEND)) return stop(1, 'La compilation du frontend a échoué');
  ok('Interface compilée');

  // 5. Serveur
  server = spawn(win ? 'node src/server.js' : 'node', win ? [] : ['src/server.js'], {
    cwd: BACKEND,
    shell: win,
    stdio: ['ignore', 'pipe', 'inherit'],
    env: { ...process.env, ...env },
  });
  server.on('exit', (code) => { if (!stopping) stop(1, `Le serveur s'est arrêté (code ${code}). Port ${APP_PORT} occupé ? Essayez : DEMO_PORT=4001 npm run demo`); });
  await new Promise((resolve) => server.stdout.on('data', (d) => d.toString().includes('API démarrée') && resolve()));

  const url = `http://localhost:${APP_PORT}`;
  console.log(`\n  ${c.green(c.bold('Démo prête :'))} ${c.cyan(c.bold(url))}\n`);
  console.log('  Comptes (mot de passe : ' + c.bold('Demo2026!pass') + ')');
  console.log('    admin@projet.local · responsable@projet.local · analyste@projet.local');
  console.log('    decideur@projet.local · operateur@projet.local');
  console.log(`\n  ${c.dim('Guide de démonstration : docs/GUIDE_DEMO.md')}`);
  console.log(`  ${c.dim('Ctrl+C pour arrêter. « npm run demo -- --reset » pour repartir de zéro.')}\n`);

  if (!process.argv.includes('--no-open')) {
    const [cmd, args] = win ? ['cmd', ['/c', 'start', '', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
    spawn(cmd, args, { stdio: 'ignore', detached: true }).unref();
  }
}

main().catch((err) => stop(1, String(err?.stack ?? err?.message ?? err)));
