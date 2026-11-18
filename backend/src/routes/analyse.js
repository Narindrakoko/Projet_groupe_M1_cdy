import { Router } from 'express';
import { prisma } from '../prisma.js';
import { toInt } from '../utils/http.js';
import { evenementScope } from '../utils/scope.js';

const router = Router();

/** Données de cartographie : lieux géolocalisés + événements et entités associés. */
router.get('/carte', async (req, res) => {
  const localisations = await prisma.localisation.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    include: {
      evenements: {
        where: evenementScope(req.user),
        select: { id: true, titre: true, dateDebut: true, impact: true, typeEvenement: true },
        orderBy: { dateDebut: 'desc' },
      },
      entites: { select: { id: true, nom: true, typeEntite: true } },
    },
  });
  res.json(localisations);
});

/**
 * Graphe du réseau des entités.
 * ?entiteId=X&profondeur=N : sous-graphe centré sur une entité (parcours en largeur).
 */
router.get('/reseau', async (req, res) => {
  const centre = toInt(req.query.entiteId);
  const profondeur = Math.min(4, Math.max(1, toInt(req.query.profondeur) ?? 2));
  const typeEntite = req.query.typeEntite ? String(req.query.typeEntite).split(',') : null;

  let liens;
  if (centre) {
    const visited = new Set([centre]);
    let frontier = [centre];
    const collected = new Map();
    for (let d = 0; d < profondeur && frontier.length; d++) {
      const batch = await prisma.lienEntreEntites.findMany({
        where: { OR: [{ entiteSourceId: { in: frontier } }, { entiteCibleId: { in: frontier } }] },
      });
      const next = [];
      for (const l of batch) {
        collected.set(l.id, l);
        for (const id of [l.entiteSourceId, l.entiteCibleId]) {
          if (!visited.has(id)) {
            visited.add(id);
            next.push(id);
          }
        }
      }
      frontier = next;
    }
    liens = [...collected.values()];
  } else {
    liens = await prisma.lienEntreEntites.findMany({ take: 2000 });
  }

  const ids = new Set(liens.flatMap((l) => [l.entiteSourceId, l.entiteCibleId]));
  if (centre) ids.add(centre);

  const whereNodes = centre || liens.length ? { id: { in: [...ids] } } : {};
  let noeuds = await prisma.entite.findMany({
    where: whereNodes,
    select: { id: true, nom: true, alias: true, typeEntite: true, nationalite: true },
    take: 2000,
  });
  if (!centre && !liens.length) noeuds = noeuds.slice(0, 200);

  if (typeEntite) {
    noeuds = noeuds.filter((n) => typeEntite.includes(n.typeEntite) || n.id === centre);
    const keep = new Set(noeuds.map((n) => n.id));
    liens = liens.filter((l) => keep.has(l.entiteSourceId) && keep.has(l.entiteCibleId));
  }

  res.json({ noeuds, liens });
});

export default router;
