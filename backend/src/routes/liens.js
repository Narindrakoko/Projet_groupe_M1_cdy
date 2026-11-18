import { crudRouter } from '../utils/crud.js';
import { badRequest, intInRange, required, toDate, toInt, toStr } from '../utils/http.js';

const entSelect = { select: { id: true, nom: true, typeEntite: true, alias: true } };

export const lienOptions = {
  resource: 'liens',
  model: 'lienEntreEntites',
  table: 'lien_entre_entites',
  searchFields: ['typeLien', 'contexte', 'entiteSource.nom', 'entiteCible.nom'],
  sortable: ['typeLien', 'debutRelation', 'fiabilite'],
  defaultOrder: { id: 'desc' },
  include: { entiteSource: entSelect, entiteCible: entSelect },
  filters: {
    entiteId: (v) => ({ OR: [{ entiteSourceId: toInt(v) }, { entiteCibleId: toInt(v) }] }),
    typeLien: (v) => ({ typeLien: { equals: v, mode: 'insensitive' } }),
  },
  buildData: (b) => {
    required(b, ['entiteSourceId', 'entiteCibleId', 'typeLien']);
    const entiteSourceId = toInt(b.entiteSourceId);
    const entiteCibleId = toInt(b.entiteCibleId);
    if (entiteSourceId === entiteCibleId) throw badRequest('Une entité ne peut pas être liée à elle-même');
    const debutRelation = toDate(b.debutRelation);
    const finRelation = toDate(b.finRelation);
    if (debutRelation && finRelation && finRelation < debutRelation) {
      throw badRequest('La fin de relation doit être postérieure au début');
    }
    return {
      entiteSourceId,
      entiteCibleId,
      typeLien: toStr(b.typeLien),
      debutRelation,
      finRelation,
      contexte: toStr(b.contexte),
      fiabilite: intInRange(b.fiabilite, 1, 6, 'La fiabilité') ?? 6,
    };
  },
};

export default crudRouter(lienOptions);
