#!/usr/bin/env node
/**
 * Exécute une commande en s'assurant que la base est disponible.
 * En mode PostgreSQL portable (DB_MODE="local"), la base est démarrée avant
 * la commande puis arrêtée après (sauf si elle tournait déjà).
 *
 *   node scripts/with-db.mjs npm run db:migrate --prefix backend
 */
import { spawn } from 'node:child_process';
import { ROOT, isLocalMode, readEnv, startLocalPostgres } from './lib/localdb.mjs';

const args = process.argv.slice(2);
if (!args.length) {
  console.error('Usage : node scripts/with-db.mjs <commande…>');
  process.exit(1);
}

const env = readEnv();
let db = null;
if (isLocalMode(env)) {
  db = await startLocalPostgres({ log: (m) => console.log(`\x1b[2m✔ ${m}\x1b[0m`) });
}

const win = process.platform === 'win32';
const child = win
  ? spawn(args.join(' '), { cwd: ROOT, stdio: 'inherit', shell: true })
  : spawn(args[0], args.slice(1), { cwd: ROOT, stdio: 'inherit' });

const finish = async (code) => {
  await db?.stop();
  process.exit(code ?? 0);
};
child.on('exit', finish);
process.on('SIGINT', () => {}); // Ctrl+C est transmis à la commande ; on arrête la base à sa sortie
