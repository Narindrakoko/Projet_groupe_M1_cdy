import { crudRouter } from '../utils/crud.js';
import { oneOf, required, toStr } from '../utils/http.js';

const TYPES = ['OSINT', 'HUMINT', 'SIGINT', 'IMINT', 'AUTRE'];
const FIABILITES = ['A', 'B', 'C', 'D', 'E', 'F'];

export const sourceOptions = {
  resource: 'sources',
  model: 'source',
  table: 'source',
  searchFields: ['nomSource', 'description'],
  sortable: ['nomSource', 'typeSource', 'fiabiliteSource', 'dateCreation'],
  defaultOrder: { nomSource: 'asc' },
  listInclude: { _count: { select: { collectes: true } } },
  include: {
    collectes: { orderBy: { dateCollecte: 'desc' }, take: 50, include: { _count: { select: { informations: true } } } },
    _count: { select: { collectes: true } },
  },
  filters: {
    typeSource: (v) => ({ typeSource: oneOf(v, TYPES, 'Type de source') }),
    fiabiliteSource: (v) => ({ fiabiliteSource: oneOf(v, FIABILITES, 'Fiabilité') }),
  },
  buildData: (b) => {
    required(b, ['typeSource', 'nomSource']);
    return {
      typeSource: oneOf(b.typeSource, TYPES, 'Type de source'),
      nomSource: toStr(b.nomSource),
      description: toStr(b.description),
      fiabiliteSource: oneOf(b.fiabiliteSource, FIABILITES, 'Fiabilité') ?? 'F',
      lienContact: toStr(b.lienContact),
    };
  },
};

export default crudRouter(sourceOptions);
