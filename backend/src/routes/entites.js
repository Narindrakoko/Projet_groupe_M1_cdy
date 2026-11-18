import { prisma } from '../prisma.js';
import { authorize } from '../middleware/auth.js';
import { audit } from '../utils/audit.js';
import { crudRouter } from '../utils/crud.js';
import { badRequest, notFound, oneOf, required, toDate, toInt, toStr } from '../utils/http.js';
import { evenementScope, infoScope } from '../utils/scope.js';

const TYPES = ['PERSONNE', 'ORGANISATION', 'LIEU', 'VEHICULE', 'AUTRE'];
const entSelect = { select: { id: true, nom: true, alias: true, typeEntite: true } };

function parseAttributs(v) {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(v);
  } catch {
    throw badRequest('Les autres attributs doivent être au format JSON (ex. {"taille": "1m80"})');
  }
}

export const entiteOptions = {
  resource: 'entites',
  model: 'entite',
  table: 'entite',
  searchFields: ['nom', 'alias', 'description', 'nationalite'],
  sortable: ['nom', 'typeEntite', 'nationalite', 'dateCreation'],
  defaultOrder: { nom: 'asc' },
  include: {
    localisation: true,
    _count: { select: { informations: true, liensSortants: true, liensEntrants: true, evenements: true } },
  },
  filters: {
    typeEntite: (v) => ({ typeEntite: { in: v.split(',').map((x) => oneOf(x, TYPES, "Type d'entité")) } }),
    nationalite: (v) => ({ nationalite: { equals: v, mode: 'insensitive' } }),
    localisationId: (v) => ({ localisationId: toInt(v) }),
  },
  buildData: (b) => {
    required(b, ['typeEntite', 'nom']);
    return {
      typeEntite: oneOf(b.typeEntite, TYPES, "Type d'entité"),
      nom: toStr(b.nom),
      alias: toStr(b.alias),
      description: toStr(b.description),
      dateNaissance: toDate(b.dateNaissance),
      nationalite: toStr(b.nationalite),
      autresAttributs: parseAttributs(b.autresAttributs),
      localisationId: toInt(b.localisationId),
    };
  },
  extend: (router) => {
    // Dossier complet d'une entité (fiche + informations + liens + événements)
    router.get('/:id/dossier', authorize('entites', 'read'), async (req, res) => {
      const id = toInt(req.params.id);
      const entite = await prisma.entite.findUnique({ where: { id }, include: { localisation: true } });
      if (!entite) throw notFound();

      const [informations, liensSortants, liensEntrants, evenements] = await Promise.all([
        prisma.infoEntite.findMany({
          where: { entiteId: id, information: infoScope(req.user) },
          include: {
            information: {
              include: {
                tags: { include: { tag: true } },
                collecte: { include: { source: { select: { nomSource: true, typeSource: true, fiabiliteSource: true } } } },
              },
            },
          },
          orderBy: { information: { dateEnregistrement: 'desc' } },
        }),
        prisma.lienEntreEntites.findMany({ where: { entiteSourceId: id }, include: { entiteCible: entSelect } }),
        prisma.lienEntreEntites.findMany({ where: { entiteCibleId: id }, include: { entiteSource: entSelect } }),
        prisma.evenement.findMany({
          where: { AND: [{ entites: { some: { entiteId: id } } }, evenementScope(req.user)] },
          include: { localisation: true },
          orderBy: { dateDebut: 'desc' },
        }),
      ]);

      const liens = [
        ...liensSortants.map((l) => ({ ...l, sens: 'sortant', autre: l.entiteCible })),
        ...liensEntrants.map((l) => ({ ...l, sens: 'entrant', autre: l.entiteSource })),
      ];

      await audit(req, 'CONSULTATION', 'entite', id, 'Consultation du dossier');
      res.json({
        entite,
        informations: informations.map((ie) => ({
          ...ie.information,
          role: ie.role,
          tags: ie.information.tags.map((t) => t.tag),
        })),
        liens,
        evenements,
      });
    });
  },
};

export default crudRouter(entiteOptions);
