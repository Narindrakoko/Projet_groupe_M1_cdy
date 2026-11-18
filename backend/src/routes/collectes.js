import { crudRouter } from '../utils/crud.js';
import { required, toDate, toInt, toStr } from '../utils/http.js';

const userSelect = { select: { id: true, nom: true, prenom: true, grade: true } };

export const collecteOptions = {
  resource: 'collectes',
  model: 'collecte',
  table: 'collecte',
  searchFields: ['methode', 'commentaire', 'source.nomSource'],
  sortable: ['dateCollecte', 'methode'],
  defaultOrder: { dateCollecte: 'desc' },
  listInclude: {
    source: { select: { id: true, nomSource: true, typeSource: true, fiabiliteSource: true } },
    collectePar: userSelect,
    _count: { select: { informations: true } },
  },
  include: {
    source: true,
    collectePar: userSelect,
    _count: { select: { informations: true } },
  },
  filters: {
    sourceId: (v) => ({ sourceId: toInt(v) }),
    methode: (v) => ({ methode: { contains: v, mode: 'insensitive' } }),
  },
  buildData: (b, { req, isUpdate, existing }) => {
    required(b, ['sourceId', 'methode']);
    return {
      sourceId: toInt(b.sourceId),
      methode: toStr(b.methode),
      dateCollecte: toDate(b.dateCollecte) ?? (isUpdate ? existing.dateCollecte : new Date()),
      collecteParId: toInt(b.collecteParId) ?? (isUpdate ? existing.collecteParId : req.user.id),
      commentaire: toStr(b.commentaire),
    };
  },
};

export default crudRouter(collecteOptions);
