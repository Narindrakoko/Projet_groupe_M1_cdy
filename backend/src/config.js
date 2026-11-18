import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(ROOT_DIR, '.env'), quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('\n✖ DATABASE_URL manquant. Lancez « npm run setup » à la racine du projet.\n');
  process.exit(1);
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'changez-moi-en-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  uploadDir: path.resolve(ROOT_DIR, process.env.UPLOAD_DIR || 'uploads'),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB) || 25,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  isProd: process.env.NODE_ENV === 'production',
};
