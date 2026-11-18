import { prisma } from '../prisma.js';
import { crudRouter } from '../utils/crud.js';
import { badRequest, forbidden, oneOf, required, toDate, toIdList, toInt, toStr } from '../utils/http.js';
import { evenementScope, infoScope } from '../utils/scope.js';

const IMPACTS = ['FAIBLE', 'MOYEN', 'ELEVE', 'CRITIQUE'];

function serialize(ev) {
  return ev.entites ? { ...ev, entites: ev.entites.map((e) => e.entite) } : ev;
}

const include = {
  localisation: true,
  information: { select: { id: true, titre: true, niveauClassification: true, statut: true } },
  entites: { include: { entite: { select: { id: true, nom: true, typeEntite: true } } } },
};

export const evenementOptions = {
  resource: 'evenements',
  model: 'evenement',
  table: 'evenement',
  scope: evenementScope,
  serialize,
  include,
  searchFields: ['titre', 'description', 'typeEvenement', 'localisation.nomLieu'],
  sortable: ['titre', 'dateDebut', 'dateFin', 'typeEvenement', 'impact'],
  defaultOrder: { dateDebut: 'desc' },
  filters: {
    dateFrom: (v) => ({ dateDebut: { gte: toDate(v) } }),
    dateTo: (v) => ({ dateDebut: { lte: toDate(v) } }),
    typeEvenement: (v) => ({ typeEvenement: { equals: v, mode: 'insensitive' } }),
    impact: (v) => ({ impact: { in: v.split(',').map((x) => oneOf(x, IMPACTS, 'Impact')) } }),
    entiteId: (v) => ({ entites: { some: { entiteId: toInt(v) } } }),
    localisationId: (v) => ({ localisationId: toInt(v) }),
    infoId: (v) => ({ infoId: toInt(v) }),
  },
  buildData: async (b, { req, isUpdate }) => {
    required(b, ['titre', 'dateDebut']);
    const dateDebut = toDate(b.dateDebut);
    const dateFin = toDate(b.dateFin);
    if (dateFin && dateFin < dateDebut) throw badRequest('La date de fin doit être postérieure à la date de début');

    const infoId = toInt(b.infoId);
    if (infoId) {
      const visible = await prisma.information.count({ where: { AND: [{ id: infoId }, infoScope(req.user)] } });
      if (!visible) throw forbidden('Information source inaccessible');
    }

    const data = {
      titre: toStr(b.titre),
      dateDebut,
      dateFin,
      description: toStr(b.description),
      localisationId: toInt(b.localisationId),
      typeEvenement: toStr(b.typeEvenement),
      impact: oneOf(b.impact, IMPACTS, 'Impact'),
      infoId,
    };
    if (b.entiteIds !== undefined || !isUpdate) {
      data.entites = {
        ...(isUpdate ? { deleteMany: {} } : {}),
        create: toIdList(b.entiteIds).map((entiteId) => ({ entiteId })),
      };
    }
    return data;
  },
};

export default crudRouter(evenementOptions);
