/**
 * PostgreSQL local portable (paquet `embedded-postgres`) — même approche que
 * `npm run db:local` du projet ClipFlow : une vraie instance PostgreSQL 17,
 * configurée à partir de DATABASE_URL, sans installation système.
 *
 * Activé lorsque backend/.env contient DB_MODE="local".
 * Données stockées dans backend/.pgdata/ (non versionné).
 */
import fs from 'node:fs';
import net from 'node:net';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const BACKEND = path.join(ROOT, 'backend');
export const ENV_FILE = path.join(BACKEND, '.env');
export const DEFAULT_DATA_DIR = path.join(BACKEND, '.pgdata');

/** Lit backend/.env (format CLE="valeur"). */
export function readEnv(file = ENV_FILE) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/.exec(line);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

export const isLocalMode = (env = readEnv()) => env.DB_MODE === 'local';

export function parseDatabaseUrl(raw) {
  const u = new URL(raw);
  return {
    host: u.hostname || 'localhost',
    port: Number(u.port || 5432),
    user: decodeURIComponent(u.username) || 'postgres',
    password: decodeURIComponent(u.password) || 'postgres',
    database: u.pathname.replace(/^\//, '') || 'postgres',
  };
}

/** Vrai si un serveur écoute déjà sur ce port. */
export function portInUse(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const sock = net.connect({ port, host });
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('error', () => resolve(false));
    sock.setTimeout(1500, () => { sock.destroy(); resolve(false); });
  });
}

async function loadEmbeddedPostgres() {
  const require = createRequire(path.join(BACKEND, 'package.json'));
  let entry;
  try {
    entry = require.resolve('embedded-postgres');
  } catch {
    throw new Error('Le paquet embedded-postgres est absent : lancez « npm run setup » (ou « npm install » dans backend).');
  }
  return (await import(pathToFileURL(entry).href)).default;
}

/** Version majeure de PostgreSQL fournie par embedded-postgres (ex. « 17 »). */
function embeddedMajor() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(BACKEND, 'node_modules', 'embedded-postgres', 'package.json'), 'utf8'));
    return pkg.version.split('.')[0];
  } catch {
    return null;
  }
}

/** Crée la base si elle n'existe pas (toujours en UTF-8). */
export async function ensureDatabase(conn) {
  const require = createRequire(path.join(BACKEND, 'package.json'));
  const { Client } = require('pg');
  const client = new Client({ host: 'localhost', port: conn.port, user: conn.user, password: conn.password, database: 'postgres' });
  await client.connect();
  try {
    const r = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [conn.database]);
    if (!r.rowCount) {
      await client.query(`CREATE DATABASE "${conn.database.replace(/"/g, '""')}" ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C'`);
      return true;
    }
    return false;
  } finally {
    await client.end();
  }
}

/**
 * Démarre l'instance locale si elle ne tourne pas déjà.
 * Renvoie { stop, started, conn } — stop() n'arrête que ce que cette fonction a démarré.
 */
export async function startLocalPostgres({ databaseUrl, dataDir = DEFAULT_DATA_DIR, log = () => {}, resetOnVersionMismatch = false } = {}) {
  const conn = parseDatabaseUrl(databaseUrl ?? readEnv().DATABASE_URL);

  if (await portInUse(conn.port)) {
    log(`PostgreSQL local déjà actif sur le port ${conn.port}`);
    await ensureDatabase(conn);
    return { started: false, conn, stop: async () => {} };
  }

  const EmbeddedPostgres = await loadEmbeddedPostgres();

  // Des données créées par une autre version majeure de PostgreSQL ne peuvent pas être ouvertes.
  const versionFile = path.join(dataDir, 'PG_VERSION');
  if (fs.existsSync(versionFile)) {
    const dataMajor = fs.readFileSync(versionFile, 'utf8').trim();
    const binMajor = embeddedMajor();
    if (binMajor && dataMajor !== binMajor) {
      if (resetOnVersionMismatch) {
        log(`Données PostgreSQL ${dataMajor} incompatibles avec PostgreSQL ${binMajor} : réinitialisation`);
        fs.rmSync(dataDir, { recursive: true, force: true });
      } else {
        throw new Error(
          `les données de ${dataDir} ont été créées par PostgreSQL ${dataMajor}, or le projet utilise PostgreSQL ${binMajor}. ` +
            'Supprimez-les avec « npm run db:local:reset » puis relancez « npm run setup ».',
        );
      }
    }
  }

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    port: conn.port,
    user: conn.user,
    password: conn.password,
    persistent: true,
    // Sans ces options, initdb reprend l'encodage Windows (WIN1252) et casse les accents.
    initdbFlags: ['--encoding=UTF8', '--no-locale'],
    onLog: () => {},
    onError: () => {},
  });

  if (!fs.existsSync(versionFile)) {
    log('Initialisation du cluster PostgreSQL local (UTF-8)…');
    await pg.initialise();
  }
  try {
    await pg.start();
  } catch (err) {
    // embedded-postgres rejette parfois sans objet Error : on rend le message exploitable
    throw new Error(`démarrage impossible sur le port ${conn.port}${err?.message ? ` (${err.message})` : ''}. Le port est peut-être occupé.`);
  }
  const created = await ensureDatabase(conn);
  log(`PostgreSQL local démarré sur le port ${conn.port}${created ? ` — base « ${conn.database} » créée` : ''}`);

  let stopped = false;
  return {
    started: true,
    conn,
    stop: async () => {
      if (stopped) return;
      stopped = true;
      try { await pg.stop(); } catch { /* déjà arrêté */ }
    },
  };
}
