import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { prisma } from '../prisma.js';
import { authenticate } from '../middleware/auth.js';
import { permissionsFor } from '../permissions.js';
import { audit } from '../utils/audit.js';
import { HttpError, badRequest, required } from '../utils/http.js';
import { checkPassword } from './utilisateurs.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.' },
});

const publicUser = ({ motDePasseHash, ...u }) => ({ ...u, permissions: permissionsFor(u.role) });

router.post('/login', loginLimiter, async (req, res) => {
  required(req.body ?? {}, ['email', 'motDePasse']);
  const email = String(req.body.email).trim().toLowerCase();
  const user = await prisma.utilisateur.findUnique({ where: { email } });

  // Message volontairement générique pour ne pas révéler l'existence d'un compte
  const ok = user && (await bcrypt.compare(String(req.body.motDePasse), user.motDePasseHash));
  if (!ok) {
    await audit({ ip: req.ip, user: user ?? null }, 'ECHEC_CONNEXION', 'utilisateur', user?.id, email);
    throw new HttpError(401, 'Identifiants incorrects');
  }
  if (user.statut !== 'ACTIF') throw new HttpError(403, 'Ce compte est suspendu. Contactez un administrateur.');

  const updated = await prisma.utilisateur.update({ where: { id: user.id }, data: { derniereConnexion: new Date() } });
  const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  await audit({ ip: req.ip, user }, 'CONNEXION', 'utilisateur', user.id);
  res.json({ token, user: publicUser(updated) });
});

router.get('/me', authenticate, (req, res) => {
  res.json(publicUser(req.user));
});

router.post('/logout', authenticate, async (req, res) => {
  await audit(req, 'DECONNEXION', 'utilisateur', req.user.id);
  res.status(204).end();
});

router.put('/password', authenticate, async (req, res) => {
  required(req.body ?? {}, ['ancienMotDePasse', 'nouveauMotDePasse']);
  const user = await prisma.utilisateur.findUnique({ where: { id: req.user.id } });
  if (!(await bcrypt.compare(String(req.body.ancienMotDePasse), user.motDePasseHash))) {
    throw badRequest('Mot de passe actuel incorrect');
  }
  checkPassword(req.body.nouveauMotDePasse);
  await prisma.utilisateur.update({
    where: { id: user.id },
    data: { motDePasseHash: await bcrypt.hash(req.body.nouveauMotDePasse, 12) },
  });
  await audit(req, 'MODIFICATION', 'utilisateur', user.id, 'Changement de mot de passe');
  res.status(204).end();
});

export default router;
