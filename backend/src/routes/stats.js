import { Router } from 'express';
import { prisma } from '../prisma.js';
import { documentScope, evenementScope, infoScope } from '../utils/scope.js';

const router = Router();

const toMap = (rows, key) => Object.fromEntries(rows.map((r) => [r[key], r._count._all]));

function lastMonths(n) {
  const out = [];
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

/** Indicateurs du tableau de bord (filtrés selon l'habilitation). */
router.get('/', async (req, res) => {
  const iw = infoScope(req.user);
  const ew = evenementScope(req.user);
  const months = lastMonths(12);
  const since = new Date(`${months[0]}-01T00:00:00`);

  const [
    nbInformations, nbEntites, nbEvenements, nbSources, nbDocuments, nbLiens, nbAValider,
    parStatut, parType, parClassification, sourcesParType, entitesParType, evenementsParImpact,
    infosRecentes, evenementsRecents, entitesAvecCompteurs, infosPeriode, evenementsPeriode,
  ] = await Promise.all([
    prisma.information.count({ where: iw }),
    prisma.entite.count(),
    prisma.evenement.count({ where: ew }),
    prisma.source.count(),
    prisma.document.count({ where: documentScope(req.user) }),
    prisma.lienEntreEntites.count(),
    prisma.information.count({ where: { AND: [iw, { statut: 'BRUT' }] } }),
    prisma.information.groupBy({ by: ['statut'], where: iw, _count: { _all: true } }),
    prisma.information.groupBy({ by: ['typeInfo'], where: iw, _count: { _all: true } }),
    prisma.information.groupBy({ by: ['niveauClassification'], where: iw, _count: { _all: true } }),
    prisma.source.groupBy({ by: ['typeSource'], _count: { _all: true } }),
    prisma.entite.groupBy({ by: ['typeEntite'], _count: { _all: true } }),
    prisma.evenement.groupBy({ by: ['impact'], where: ew, _count: { _all: true } }),
    prisma.information.findMany({
      where: iw,
      orderBy: { dateEnregistrement: 'desc' },
      take: 6,
      select: { id: true, titre: true, statut: true, niveauClassification: true, fiabiliteContenu: true, dateEnregistrement: true, typeInfo: true },
    }),
    prisma.evenement.findMany({
      where: ew,
      orderBy: { dateDebut: 'desc' },
      take: 6,
      select: { id: true, titre: true, dateDebut: true, impact: true, typeEvenement: true, localisation: { select: { nomLieu: true } } },
    }),
    prisma.entite.findMany({
      select: { id: true, nom: true, typeEntite: true, _count: { select: { liensSortants: true, liensEntrants: true, informations: true } } },
    }),
    prisma.information.findMany({ where: { AND: [iw, { dateEnregistrement: { gte: since } }] }, select: { dateEnregistrement: true } }),
    prisma.evenement.findMany({ where: { AND: [ew, { dateDebut: { gte: since } }] }, select: { dateDebut: true } }),
  ]);

  const parMois = (rows, field) => {
    const counts = Object.fromEntries(months.map((m) => [m, 0]));
    for (const r of rows) {
      const k = monthKey(r[field]);
      if (k in counts) counts[k] += 1;
    }
    return months.map((m) => ({ mois: m, total: counts[m] }));
  };

  const entitesCles = entitesAvecCompteurs
    .map((e) => ({
      id: e.id,
      nom: e.nom,
      typeEntite: e.typeEntite,
      liens: e._count.liensSortants + e._count.liensEntrants,
      informations: e._count.informations,
    }))
    .sort((a, b) => b.liens + b.informations - (a.liens + a.informations))
    .slice(0, 6);

  res.json({
    totaux: {
      informations: nbInformations,
      entites: nbEntites,
      evenements: nbEvenements,
      sources: nbSources,
      documents: nbDocuments,
      liens: nbLiens,
      aValider: nbAValider,
    },
    informationsParStatut: toMap(parStatut, 'statut'),
    informationsParType: toMap(parType, 'typeInfo'),
    informationsParClassification: toMap(parClassification, 'niveauClassification'),
    sourcesParType: toMap(sourcesParType, 'typeSource'),
    entitesParType: toMap(entitesParType, 'typeEntite'),
    evenementsParImpact: toMap(evenementsParImpact.map((r) => ({ ...r, impact: r.impact ?? 'NON_EVALUE' })), 'impact'),
    informationsParMois: parMois(infosPeriode, 'dateEnregistrement'),
    evenementsParMois: parMois(evenementsPeriode, 'dateDebut'),
    informationsRecentes: infosRecentes,
    evenementsRecents,
    entitesCles,
  });
});

export default router;
