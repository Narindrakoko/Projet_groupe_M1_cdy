import { prisma } from '../prisma.js';
import { authorize } from '../middleware/auth.js';
import { can } from '../permissions.js';
import { audit } from '../utils/audit.js';
import { crudRouter } from '../utils/crud.js';
import { badRequest, forbidden, intInRange, notFound, oneOf, required, toDate, toIdList, toInt, toStr } from '../utils/http.js';
import { infoScope } from '../utils/scope.js';

const TYPES = ['TEXTE', 'DOCUMENT', 'IMAGE', 'VIDEO', 'AUDIO', 'AUTRE'];
const STATUTS = ['BRUT', 'VALIDE', 'ARCHIVE'];

const collecteInclude = {
  include: { source: { select: { id: true, nomSource: true, typeSource: true, fiabiliteSource: true } } },
};

/** Aplatit les tables d'association pour le client. */
function serialize(info) {
  const out = { ...info };
  if (info.tags) out.tags = info.tags.map((t) => t.tag);
  if (info.entites) out.entites = info.entites.map((e) => ({ ...e.entite, role: e.role }));
  return out;
}

/** Vérifie les règles métier sur la classification et le statut. */
function checkRules(user, { niveauClassification, statut }, existing) {
  if (niveauClassification > user.niveauHabilitation) {
    throw forbidden('Vous ne pouvez pas classifier une information au-delà de votre niveau d\'habilitation');
  }
  const statutChange = statut !== (existing?.statut ?? 'BRUT');
  if (statutChange && statut !== 'BRUT' && !can(user.role, 'informations', 'validate')) {
    throw forbidden('Seul un responsable peut valider ou archiver une information');
  }
}

/** Liste des entités liées : [{ entiteId, role }] */
function parseEntites(v) {
  if (!Array.isArray(v)) return toIdList(v).map((entiteId) => ({ entiteId, role: null }));
  const seen = new Set();
  return v
    .map((e) => (typeof e === 'object' ? { entiteId: toInt(e.entiteId ?? e.id), role: toStr(e.role) } : { entiteId: toInt(e), role: null }))
    .filter((e) => e.entiteId !== null && !seen.has(e.entiteId) && seen.add(e.entiteId));
}

export const informationOptions = {
  resource: 'informations',
  model: 'information',
  table: 'information',
  scope: infoScope,
  serialize,
  auditRead: true,
  searchFields: ['titre', 'contenuTexte'],
  sortable: ['titre', 'dateEvenement', 'dateEnregistrement', 'fiabiliteContenu', 'niveauClassification', 'statut', 'typeInfo'],
  defaultOrder: { dateEnregistrement: 'desc' },
  listInclude: {
    collecte: collecteInclude,
    tags: { include: { tag: true } },
    _count: { select: { documents: true, entites: true } },
  },
  include: {
    collecte: { include: { ...collecteInclude.include, collectePar: { select: { id: true, nom: true, prenom: true } } } },
    tags: { include: { tag: true } },
    entites: { include: { entite: true } },
    documents: { orderBy: { dateAjout: 'desc' } },
    evenements: { include: { localisation: true }, orderBy: { dateDebut: 'desc' } },
  },
  filters: {
    typeInfo: (v) => ({ typeInfo: { in: v.split(',').map((x) => oneOf(x, TYPES, 'Type')) } }),
    statut: (v) => ({ statut: { in: v.split(',').map((x) => oneOf(x, STATUTS, 'Statut')) } }),
    classification: (v) => ({ niveauClassification: { in: toIdList(v) } }),
    fiabiliteMax: (v) => ({ fiabiliteContenu: { lte: toInt(v) } }),
    fiabiliteSource: (v) => ({ collecte: { source: { fiabiliteSource: { in: v.split(',') } } } }),
    sourceId: (v) => ({ collecte: { sourceId: toInt(v) } }),
    typeSource: (v) => ({ collecte: { source: { typeSource: { in: v.split(',') } } } }),
    collecteId: (v) => ({ collecteId: toInt(v) }),
    tagId: (v) => ({ tags: { some: { tagId: { in: toIdList(v) } } } }),
    entiteId: (v) => ({ entites: { some: { entiteId: toInt(v) } } }),
    dateFrom: (v) => ({ dateEvenement: { gte: toDate(v) } }),
    dateTo: (v) => ({ dateEvenement: { lte: endOfDay(toDate(v)) } }),
  },
  buildData: (b, { req, isUpdate, existing }) => {
    required(b, ['titre']);
    const data = {
      titre: toStr(b.titre),
      contenuTexte: toStr(b.contenuTexte),
      typeInfo: oneOf(b.typeInfo, TYPES, "Type d'information") ?? 'TEXTE',
      dateEvenement: toDate(b.dateEvenement),
      collecteId: toInt(b.collecteId),
      fiabiliteContenu: intInRange(b.fiabiliteContenu, 1, 6, 'La fiabilité du contenu') ?? 6,
      niveauClassification: intInRange(b.niveauClassification, 1, 4, 'Le niveau de classification') ?? 1,
      statut: oneOf(b.statut, STATUTS, 'Statut') ?? (existing?.statut ?? 'BRUT'),
    };
    checkRules(req.user, data, existing);

    const tagIds = toIdList(b.tagIds);
    // Conserve le rôle déjà saisi d'une entité lorsque seule la liste des identifiants est envoyée
    const previousRoles = new Map((existing?.entites ?? []).map((e) => [e.entiteId, e.role]));
    const entites = parseEntites(b.entites ?? b.entiteIds).map((e) => ({
      ...e,
      role: e.role ?? previousRoles.get(e.entiteId) ?? null,
    }));
    const reset = isUpdate ? { deleteMany: {} } : {};
    if (b.tagIds !== undefined || !isUpdate) data.tags = { ...reset, create: tagIds.map((tagId) => ({ tagId })) };
    if (b.entites !== undefined || b.entiteIds !== undefined || !isUpdate) data.entites = { ...reset, create: entites };
    return data;
  },
  extend: (router, { findScoped }) => {
    // Changement de statut (validation / archivage) réservé aux responsables
    router.patch('/:id/statut', authorize('informations', 'validate'), async (req, res) => {
      const id = toInt(req.params.id);
      const statut = oneOf(req.body?.statut, STATUTS, 'Statut');
      if (!statut) throw badRequest('Statut requis');
      const existing = await findScoped(id, req.user, undefined);
      if (!existing) throw notFound();
      const updated = await prisma.information.update({ where: { id }, data: { statut } });
      await audit(req, 'MODIFICATION', 'information', id, `Statut : ${existing.statut} → ${statut}`);
      res.json(updated);
    });
  },
};

function endOfDay(d) {
  if (!d) return d;
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export default crudRouter(informationOptions);
