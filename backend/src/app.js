import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config, ROOT_DIR } from './config.js';
import { authenticate } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

import authRoutes from './routes/auth.js';
import sourceRoutes from './routes/sources.js';
import collecteRoutes from './routes/collectes.js';
import informationRoutes from './routes/informations.js';
import entiteRoutes from './routes/entites.js';
import lienRoutes from './routes/liens.js';
import localisationRoutes from './routes/localisations.js';
import evenementRoutes from './routes/evenements.js';
import documentRoutes from './routes/documents.js';
import tagRoutes from './routes/tags.js';
import utilisateurRoutes from './routes/utilisateurs.js';
import historiqueRoutes from './routes/historique.js';
import rechercheRoutes from './routes/recherche.js';
import statsRoutes from './routes/stats.js';
import analyseRoutes from './routes/analyse.js';
import exportRoutes from './routes/exports.js';
import referentielRoutes from './routes/referentiels.js';

export const app = express();

app.set('trust proxy', 'loopback');
app.disable('x-powered-by');
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    // Les serveurs de tuiles OpenStreetMap exigent un en-tête Referer (sinon 403 « Access blocked »).
    // Cette politique n'envoie que l'origine (http://hote:port), jamais le chemin des pages.
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }),
);
app.use(cors({ origin: config.corsOrigin.split(','), credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);

// Toutes les routes suivantes exigent une authentification
const api = express.Router();
api.use(authenticate);
api.use('/sources', sourceRoutes);
api.use('/collectes', collecteRoutes);
api.use('/informations', informationRoutes);
api.use('/entites', entiteRoutes);
api.use('/liens', lienRoutes);
api.use('/localisations', localisationRoutes);
api.use('/evenements', evenementRoutes);
api.use('/documents', documentRoutes);
api.use('/tags', tagRoutes);
api.use('/utilisateurs', utilisateurRoutes);
api.use('/historique', historiqueRoutes);
api.use('/recherche', rechercheRoutes);
api.use('/stats', statsRoutes);
api.use('/analyse', analyseRoutes);
api.use('/export', exportRoutes);
api.use('/referentiels', referentielRoutes);
app.use('/api', api);
app.use('/api', notFoundHandler);

// En production, le backend sert aussi l'interface compilée (frontend/dist)
const dist = path.resolve(ROOT_DIR, '../frontend/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(errorHandler);
