import { Prisma } from '@prisma/client';
import multer from 'multer';
import { HttpError } from '../utils/http.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route introuvable : ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Fichier trop volumineux' : `Erreur d'envoi : ${err.message}`;
    return res.status(400).json({ error: msg });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({ error: 'Cette valeur existe déjà', details: err.meta?.target });
      case 'P2003':
        return res.status(409).json({ error: 'Opération impossible : des éléments liés existent encore' });
      case 'P2025':
        return res.status(404).json({ error: 'Ressource introuvable' });
      default:
        break;
    }
  }
  // Violation de contrainte RESTRICT / clé étrangère remontée par PostgreSQL
  if (err instanceof Prisma.PrismaClientUnknownRequestError && /23001|23503|foreign key/i.test(err.message)) {
    return res.status(409).json({ error: 'Suppression impossible : cet élément est encore utilisé par d\'autres données' });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Corps de requête JSON invalide' });
  }
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
}
