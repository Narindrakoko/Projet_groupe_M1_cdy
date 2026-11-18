import { Router } from 'express';
import { prisma } from '../prisma.js';
import { toStr } from '../utils/http.js';
import { evenementScope, infoScope } from '../utils/scope.js';
import { can } from '../permissions.js';

const router = Router();
const ci = (q) => ({ contains: q, mode: 'insensitive' });

/** Recherche globale (barre de recherche) : quelques résultats par catégorie. */
router.get('/', async (req, res) => {
  const q = toStr(req.query.q);
  if (!q || q.length < 2) return res.json({ informations: [], entites: [], evenements: [], sources: [], localisations: [] });
  const take = Math.min(20, Number(req.query.limit) || 5);
  const role = req.user.role;

  const [informations, entites, evenements, sources, localisations] = await Promise.all([
    can(role, 'informations', 'read')
      ? prisma.information.findMany({
          where: { AND: [infoScope(req.user), { OR: [{ titre: ci(q) }, { contenuTexte: ci(q) }] }] },
          select: { id: true, titre: true, statut: true, niveauClassification: true, dateEnregistrement: true },
          orderBy: { dateEnregistrement: 'desc' },
          take,
        })
      : [],
    prisma.entite.findMany({
      where: { OR: [{ nom: ci(q) }, { alias: ci(q) }, { description: ci(q) }] },
      select: { id: true, nom: true, alias: true, typeEntite: true },
      orderBy: { nom: 'asc' },
      take,
    }),
    prisma.evenement.findMany({
      where: { AND: [evenementScope(req.user), { OR: [{ titre: ci(q) }, { description: ci(q) }] }] },
      select: { id: true, titre: true, dateDebut: true, impact: true },
      orderBy: { dateDebut: 'desc' },
      take,
    }),
    prisma.source.findMany({
      where: { OR: [{ nomSource: ci(q) }, { description: ci(q) }] },
      select: { id: true, nomSource: true, typeSource: true, fiabiliteSource: true },
      take,
    }),
    prisma.localisation.findMany({
      where: { OR: [{ nomLieu: ci(q) }, { pays: ci(q) }] },
      select: { id: true, nomLieu: true, pays: true },
      take,
    }),
  ]);

  res.json({ informations, entites, evenements, sources, localisations });
});

export default router;
