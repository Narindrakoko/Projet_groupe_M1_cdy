import { crudRouter } from '../utils/crud.js';
import { required, toStr } from '../utils/http.js';

export const tagOptions = {
  resource: 'tags',
  model: 'tag',
  table: 'tag',
  searchFields: ['nomTag', 'categorie'],
  sortable: ['nomTag', 'categorie'],
  defaultOrder: { nomTag: 'asc' },
  include: { _count: { select: { infos: true } } },
  filters: {
    categorie: (v) => ({ categorie: v }),
  },
  buildData: (b) => {
    required(b, ['nomTag']);
    return { nomTag: toStr(b.nomTag), categorie: toStr(b.categorie) };
  },
};

export default crudRouter(tagOptions);
