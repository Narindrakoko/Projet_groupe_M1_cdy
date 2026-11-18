#!/usr/bin/env node
/**
 * PostgreSQL local portable, piloté par DATABASE_URL (backend/.env).
 *
 *   npm run db:local         → démarre la base et reste actif (Ctrl+C pour arrêter)
 *   npm run db:local:reset   → supprime toutes les données locales (backend/.pgdata)
 *
 * Inutile en temps normal : « npm run dev » et « npm start » démarrent la base
 * automatiquement lorsque DB_MODE="local". Pratique pour Prisma Studio, pgAdmin, etc.
 */
import fs from 'node:fs';
import { DEFAULT_DATA_DIR, isLocalMode, parseDatabaseUrl, portInUse, readEnv, startLocalPostgres } from './lib/localdb.mjs';

const env = readEnv();
const cmd = process.argv[2];

if (!env.DATABASE_URL) {
  console.error('\n✖ backend/.env introuvable. Lancez d\'abord « npm run setup ».\n');
  process.exit(1);
}
if (!isLocalMode(env)) {
  console.log('\nℹ Ce poste utilise un PostgreSQL installé (DB_MODE différent de « local »).');
  console.log('  Pour passer au PostgreSQL portable : npm run setup -- --reconfigure\n');
  process.exit(0);
}

if (cmd === 'reset') {
  const { port } = parseDatabaseUrl(env.DATABASE_URL);
  if (await portInUse(port)) {
    console.error(`\n✖ La base locale tourne encore (port ${port}). Arrêtez l'application puis recommencez.\n`);
    process.exit(1);
  }
  fs.rmSync(DEFAULT_DATA_DIR, { recursive: true, force: true });
  console.log('\n✔ Données locales supprimées. Relancez « npm run setup » pour recréer les tables et la démo.\n');
  process.exit(0);
}

if (cmd !== 'up') {
  console.error('Usage : node scripts/db-local.mjs <up|reset>');
  process.exit(1);
}

const db = await startLocalPostgres({ log: (m) => console.log(`✔ ${m}`) });
const { conn } = db;
console.log(`\nPostgreSQL local prêt : postgresql://${conn.user}:***@localhost:${conn.port}/${conn.database}`);
if (!db.started) process.exit(0);
console.log('Ctrl+C pour arrêter.\n');

const shutdown = async () => {
  console.log('\nArrêt de PostgreSQL local…');
  await db.stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
await new Promise(() => {});
