import { Router } from 'express';
import { prisma } from '../prisma.js';

const router = Router();

/** Valeurs déjà saisies pour les champs libres (suggestions dans les formulaires). */
router.get('/', async (_req, res) => {
  const distinct = async (model, field) =>
    (await prisma[model].findMany({ where: { [field]: { not: null } }, select: { [field]: true }, distinct: [field], orderBy: { [field]: 'asc' } }))
      .map((r) => r[field])
      .filter(Boolean);

  const [typesLien, typesEvenement, methodes, typesLieu, pays, nationalites, categoriesTag, services] = await Promise.all([
    prisma.lienEntreEntites.findMany({ select: { typeLien: true }, distinct: ['typeLien'], orderBy: { typeLien: 'asc' } }).then((r) => r.map((x) => x.typeLien)),
    distinct('evenement', 'typeEvenement'),
    prisma.collecte.findMany({ select: { methode: true }, distinct: ['methode'], orderBy: { methode: 'asc' } }).then((r) => r.map((x) => x.methode)),
    distinct('localisation', 'typeLieu'),
    distinct('localisation', 'pays'),
    distinct('entite', 'nationalite'),
    distinct('tag', 'categorie'),
    distinct('utilisateur', 'service'),
  ]);

  res.json({ typesLien, typesEvenement, methodes, typesLieu, pays, nationalites, categoriesTag, services });
});

export default router;
