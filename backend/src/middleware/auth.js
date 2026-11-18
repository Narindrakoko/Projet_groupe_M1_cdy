import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../prisma.js';
import { can } from '../permissions.js';
import { HttpError, forbidden } from '../utils/http.js';

/** Vérifie le jeton JWT et charge l'utilisateur courant. */
export async function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Authentification requise'));

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return next(new HttpError(401, 'Session expirée ou invalide'));
  }

  const user = await prisma.utilisateur.findUnique({ where: { id: payload.sub } });
  if (!user || user.statut !== 'ACTIF') return next(new HttpError(401, 'Compte inactif ou supprimé'));

  const { motDePasseHash, ...safe } = user;
  req.user = safe;
  next();
}

/** Autorise l'accès selon la matrice de permissions. */
export function authorize(resource, action) {
  return (req, _res, next) => {
    if (!req.user || !can(req.user.role, resource, action)) {
      return next(forbidden("Vous n'avez pas les droits nécessaires pour cette action"));
    }
    next();
  };
}
