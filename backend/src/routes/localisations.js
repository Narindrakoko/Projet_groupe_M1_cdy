import { crudRouter } from '../utils/crud.js';
import { badRequest, required, toFloat, toStr } from '../utils/http.js';

function coord(v, min, max, label) {
  const n = toFloat(v);
  if (n !== null && (n < min || n > max)) throw badRequest(`${label} doit être comprise entre ${min} et ${max}`);
  return n;
}

export const localisationOptions = {
  resource: 'localisations',
  model: 'localisation',
  table: 'localisation',
  searchFields: ['nomLieu', 'pays', 'typeLieu', 'description'],
  sortable: ['nomLieu', 'pays', 'typeLieu'],
  defaultOrder: { nomLieu: 'asc' },
  include: { _count: { select: { evenements: true, entites: true } } },
  filters: {
    pays: (v) => ({ pays: { equals: v, mode: 'insensitive' } }),
    typeLieu: (v) => ({ typeLieu: v }),
  },
  buildData: (b) => {
    required(b, ['nomLieu']);
    return {
      nomLieu: toStr(b.nomLieu),
      typeLieu: toStr(b.typeLieu),
      pays: toStr(b.pays),
      latitude: coord(b.latitude, -90, 90, 'La latitude'),
      longitude: coord(b.longitude, -180, 180, 'La longitude'),
      description: toStr(b.description),
    };
  },
};

export default crudRouter(localisationOptions);
