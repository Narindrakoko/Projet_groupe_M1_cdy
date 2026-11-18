#!/usr/bin/env node
/**
 * Installation guidée du projet sur un nouvel appareil.
 *
 *   npm run setup            → mode interactif (questions sur PostgreSQL)
 *   npm run setup -- --yes   → valeurs par défaut / variables d'environnement, sans question
 *
 * Variables reconnues en mode --yes : DB_MODE (local|system), PGHOST, PGPORT, PGUSER,
 * PGPASSWORD, PGDATABASE, APP_PORT
 *
 * Deux modes de base de données :
 *   - system : PostgreSQL déjà installé sur le poste (ou Docker) ;
 *   - local  : PostgreSQL portable (embedded-postgres), aucune installation,
 *              démarré automatiquement par « npm run dev » / « npm start ».
 *
 * Étapes : dépendances → choix de la base → création de la base (UTF-8) → .env
 *          → migrations Prisma → données de démonstration.
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { portInUse, startLocalPostgres } from './lib/localdb.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');
const ENV_FILE = path.join(BACKEND, '.env');
const AUTO = process.argv.includes('--yes') || process.argv.includes('-y') || !process.stdin.isTTY;
const RECONFIGURE = process.argv.includes('--reconfigure');

const c = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};
const step = (n, total, msg) => console.log(`\n${c.cyan(`[${n}/${total}]`)} ${c.bold(msg)}`);
const ok = (msg) => console.log(`  ${c.green('✔')} ${msg}`);
const warn = (msg) => console.log(`  ${c.yellow('⚠')} ${msg}`);
const fail = (msg) => {
  console.error(`\n  ${c.red('✖')} ${msg}\n`);
  process.exit(1);
};

function run(cmd, args, cwd, { quiet = false } = {}) {
  // Sous Windows, npm/npx sont des scripts .cmd : on passe par le shell avec une commande unique (arguments constants).
  const win = process.platform === 'win32';
  const opts = { cwd, stdio: quiet ? 'pipe' : 'inherit', shell: win, encoding: 'utf8' };
  const res = win ? spawnSync([cmd, ...args].join(' '), opts) : spawnSync(cmd, args, opts);
  return res.status === 0 ? { ok: true, out: res.stdout } : { ok: false, out: `${res.stdout || ''}${res.stderr || ''}` };
}

/* ---------- Saisie utilisateur ---------- */
const rl = AUTO ? null : readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question, def = '') {
  if (AUTO) return Promise.resolve(def);
  return new Promise((resolve) => {
    rl.question(`  ${question}${def ? c.dim(` (${def})`) : ''} : `, (a) => resolve(a.trim() || def));
  });
}

/** Saisie masquée (mot de passe). */
function askHidden(question, def = '') {
  if (AUTO) return Promise.resolve(def);
  return new Promise((resolve) => {
    const prompt = `  ${question}${def ? c.dim(' (valeur actuelle conservée si vide)') : ''} : `;
    process.stdout.write(prompt);
    const stdin = process.stdin;
    rl.pause();
    stdin.setRawMode?.(true);
    stdin.resume();
    let value = '';
    const onData = (buf) => {
      for (const ch of buf.toString('utf8')) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode?.(false);
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.resume();
          return resolve(value || def);
        }
        if (ch === '\u0003') process.exit(130);
        if (ch === '\u007f' || ch === '\b') {
          if (value) { value = value.slice(0, -1); process.stdout.write('\b \b'); }
        } else {
          value += ch;
          process.stdout.write('•');
        }
      }
    };
    stdin.on('data', onData);
  });
}

/* ---------- .env ---------- */
function readEnv() {
  if (!fs.existsSync(ENV_FILE)) return {};
  const out = {};
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/.exec(line);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function parseDbUrl(url) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname, port: u.port || '5432', user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password), database: u.pathname.slice(1),
    };
  } catch {
    return null;
  }
}

const buildUrl = (db, name = db.database) =>
  `postgresql://${encodeURIComponent(db.user)}:${encodeURIComponent(db.password)}@${db.host}:${db.port}/${name}?schema=public`;

function writeEnv(db, port, jwtSecret, mode) {
  const content = [
    '# Généré par « npm run setup » — ne pas versionner ce fichier',
    '# DB_MODE : "local" = PostgreSQL portable démarré automatiquement, "system" = PostgreSQL installé',
    `DB_MODE="${mode}"`,
    `DATABASE_URL="${buildUrl(db)}"`,
    `JWT_SECRET="${jwtSecret}"`,
    'JWT_EXPIRES_IN="8h"',
    `PORT=${port}`,
    'CORS_ORIGIN="http://localhost:5173"',
    'UPLOAD_DIR="uploads"',
    'MAX_UPLOAD_MB=25',
    '',
  ].join('\n');
  fs.writeFileSync(ENV_FILE, content, 'utf8');
}

/* ---------- PostgreSQL ---------- */
function pgClient() {
  const require = createRequire(path.join(BACKEND, 'package.json'));
  return require('pg').Client;
}

async function tryConnect(db, database = 'postgres') {
  const Client = pgClient();
  const client = new Client({ host: db.host, port: Number(db.port), user: db.user, password: db.password, database, connectionTimeoutMillis: 6000 });
  try {
    await client.connect();
    return { client };
  } catch (error) {
    return { error };
  }
}

function explain(error) {
  switch (error.code) {
    case 'ECONNREFUSED': return 'PostgreSQL ne répond pas : vérifiez que le service est démarré et que le port est correct.';
    case '28P01': return 'Mot de passe incorrect pour cet utilisateur PostgreSQL.';
    case '28000': return "Cet utilisateur PostgreSQL n'existe pas ou n'est pas autorisé.";
    case 'ENOTFOUND': return 'Hôte introuvable.';
    case '3D000': return "La base de maintenance « postgres » n'existe pas.";
    default: return error.message;
  }
}

async function ensureDatabase(client, name) {
  const exists = await client.query('SELECT pg_encoding_to_char(encoding) AS enc FROM pg_database WHERE datname = $1', [name]);
  if (exists.rowCount) {
    const enc = exists.rows[0].enc;
    if (enc !== 'UTF8') {
      warn(`La base « ${name} » existe déjà mais utilise l'encodage ${enc} (les accents poseront problème).`);
      warn(`Supprimez-la (DROP DATABASE ${name};) puis relancez « npm run setup », ou choisissez un autre nom.`);
      return false;
    }
    ok(`Base « ${name} » déjà présente (UTF-8)`);
    return true;
  }
  const ident = `"${name.replace(/"/g, '""')}"`;
  // Sous Windows, la locale par défaut est souvent WIN1252 : on force l'UTF-8.
  const attempts = [
    `CREATE DATABASE ${ident} ENCODING 'UTF8' TEMPLATE template0 LOCALE_PROVIDER icu ICU_LOCALE 'fr-FR' LOCALE 'C'`,
    `CREATE DATABASE ${ident} ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C'`,
  ];
  let lastErr;
  for (const sql of attempts) {
    try {
      await client.query(sql);
      ok(`Base « ${name} » créée en UTF-8`);
      return true;
    } catch (err) {
      lastErr = err;
    }
  }
  fail(`Impossible de créer la base : ${lastErr.message}\n    Vérifiez que l'utilisateur a le droit CREATEDB.`);
  return false;
}

/* ---------- Programme principal ---------- */
async function main() {
  const TOTAL = 5;
  console.log(c.bold('\n  Sentinelle — installation du projet\n'));

  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 18 || (major === 18 && minor < 18)) fail(`Node.js 18.18 ou supérieur est requis (version actuelle : ${process.versions.node}).`);

  // 1. Dépendances
  step(1, TOTAL, 'Installation des dépendances');
  for (const [label, dir] of [['backend', BACKEND], ['frontend', FRONTEND]]) {
    const r = run('npm', ['install', '--no-fund', '--no-audit'], dir);
    if (!r.ok) fail(`Échec de « npm install » dans ${label}.`);
    ok(`Dépendances ${label} installées`);
  }

  // 2. Choix et configuration de PostgreSQL
  step(2, TOTAL, 'Choix et configuration de PostgreSQL');
  const current = readEnv();
  const fromUrl = current.DATABASE_URL ? parseDbUrl(current.DATABASE_URL) : null;
  let db;
  let mode;
  let appPort = current.PORT || process.env.APP_PORT || '4000';

  if (fromUrl && !RECONFIGURE) {
    db = fromUrl;
    mode = current.DB_MODE === 'local' ? 'local' : 'system';
    ok(`Configuration existante réutilisée : ${mode === 'local' ? 'PostgreSQL portable' : 'PostgreSQL installé'} (${db.host}:${db.port}/${db.database})`);
    console.log(c.dim('    Pour la modifier : npm run setup -- --reconfigure'));
  } else {
    const systemDetected = await portInUse(5432);
    if (AUTO) {
      mode = ['local', 'system'].includes(process.env.DB_MODE) ? process.env.DB_MODE : systemDetected ? 'system' : 'local';
    } else {
      console.log(`    ${c.bold('1')}  PostgreSQL déjà installé sur ce poste ${systemDetected ? c.green('(un serveur répond sur le port 5432)') : c.dim('(aucun serveur détecté sur le port 5432)')}`);
      console.log(`    ${c.bold('2')}  PostgreSQL portable — rien à installer, démarré automatiquement avec l'application`);
      const choice = await ask('Votre choix', systemDetected ? '1' : '2');
      mode = choice === '2' ? 'local' : 'system';
    }
    const d = fromUrl || {};
    const sameMode = current.DB_MODE === mode;
    if (mode === 'local') {
      db = {
        host: 'localhost',
        port: await ask('Port de la base portable', process.env.PGPORT || (sameMode && d.port) || '54329'),
        user: 'postgres',
        // Instance strictement locale : mot de passe aléatoire, conservé dans backend/.env
        password: sameMode && d.password ? d.password : crypto.randomBytes(12).toString('hex'),
        database: process.env.PGDATABASE || (sameMode && d.database) || 'projet_bd',
      };
    } else {
      if (!AUTO) console.log(c.dim('    Appuyez sur Entrée pour accepter la valeur proposée.\n'));
      db = {
        host: await ask('Hôte PostgreSQL', process.env.PGHOST || (sameMode && d.host) || 'localhost'),
        port: await ask('Port', process.env.PGPORT || (sameMode && d.port) || '5432'),
        user: await ask('Utilisateur', process.env.PGUSER || (sameMode && d.user) || 'postgres'),
        password: await askHidden('Mot de passe', process.env.PGPASSWORD || (sameMode && d.password) || ''),
        database: await ask('Nom de la base à utiliser', process.env.PGDATABASE || (sameMode && d.database) || 'projet_bd'),
      };
    }
    appPort = await ask("Port de l'application", appPort);
  }

  // 3. Connexion et création de la base
  let localDb = null;
  if (mode === 'local') {
    step(3, TOTAL, 'Démarrage du PostgreSQL portable et création de la base');
    try {
      localDb = await startLocalPostgres({ databaseUrl: buildUrl(db), log: (m) => ok(m) });
    } catch (err) {
      fail(`PostgreSQL portable : ${err.message}`);
    }
  } else {
    step(3, TOTAL, 'Connexion à PostgreSQL et création de la base');
    let conn = await tryConnect(db);
    let tries = 0;
    while (conn.error && !AUTO && tries < 3) {
      warn(explain(conn.error));
      tries += 1;
      if (conn.error.code === '28P01' || conn.error.code === '28000') {
        db.user = await ask('Utilisateur', db.user);
        db.password = await askHidden('Mot de passe', '');
      } else {
        db.host = await ask('Hôte PostgreSQL', db.host);
        db.port = await ask('Port', db.port);
      }
      conn = await tryConnect(db);
    }
    if (conn.error) fail(`Connexion impossible : ${explain(conn.error)}`);
    const version = (await conn.client.query('SHOW server_version')).rows[0].server_version;
    ok(`Connecté à PostgreSQL ${version}`);
    const created = await ensureDatabase(conn.client, db.database);
    await conn.client.end();
    if (!created) process.exit(1);
  }

  /** Arrête la base portable (si démarrée ici) avant de quitter. */
  const finish = async (code, message) => {
    if (message) console.error(`\n  ${c.red('✖')} ${message}\n`);
    await localDb?.stop();
    rl?.close();
    process.exit(code);
  };

  const jwtSecret = current.JWT_SECRET && !current.JWT_SECRET.startsWith('dev-') ? current.JWT_SECRET : crypto.randomBytes(48).toString('base64url');
  writeEnv(db, appPort, jwtSecret, mode);
  ok(`Fichier backend/.env écrit (mode ${mode === 'local' ? 'PostgreSQL portable' : 'PostgreSQL installé'}, secret JWT généré)`);

  // 4. Migrations
  step(4, TOTAL, 'Création des tables (migrations Prisma)');
  if (!run('npx', ['prisma', 'migrate', 'deploy'], BACKEND).ok) await finish(1, 'Les migrations ont échoué.');
  ok('Schéma à jour');

  // 5. Données de démonstration
  step(5, TOTAL, 'Données de démonstration');
  if (!run('node', ['prisma/seed.js'], BACKEND).ok) await finish(1, "L'insertion des données de démonstration a échoué.");
  if (localDb?.started) {
    await localDb.stop();
    ok('PostgreSQL portable arrêté — il redémarrera automatiquement avec « npm run dev » / « npm start »');
  }

  rl?.close();
  console.log(`\n${c.green(c.bold('  Installation terminée.'))}\n`);
  console.log(`  Lancer en développement : ${c.bold('npm run dev')}   → ${c.cyan('http://localhost:5173')}`);
  console.log(`  Lancer en production    : ${c.bold('npm start')}     → ${c.cyan(`http://localhost:${appPort}`)}`);
  console.log(`  Comptes de démonstration : ${c.bold('admin@projet.local')} … mot de passe ${c.bold('Demo2026!pass')}\n`);
  process.exit(0);
}

main().catch((err) => {
  rl?.close();
  fail(err.stack || err.message);
});
