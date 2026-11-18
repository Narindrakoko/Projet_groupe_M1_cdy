import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authorize } from '../middleware/auth.js';
import { audit } from './audit.js';
import { notFound, pagination, toInt, toStr } from './http.js';

/** Construit une condition « contient » insensible à la casse, y compris sur un chemin imbriqué (ex. "source.nomSource"). */
function containsPath(path, q) {
  const parts = path.split('.');
  const leaf = { contains: q, mode: 'insensitive' };
  return parts.reduceRight((acc, key) => ({ [key]: acc }), leaf);
}

/** Construit la clause where d'une liste à partir de la requête (recherche, filtres, habilitation). */
export function buildWhere({ scope, searchFields = [], filters = {} }, req) {
  const and = [];
  if (scope) and.push(scope(req.user));

  const q = toStr(req.query.q);
  if (q && searchFields.length) and.push({ OR: searchFields.map((f) => containsPath(f, q)) });

  for (const [key, fn] of Object.entries(filters)) {
    const v = req.query[key];
    if (v !== undefined && v !== '') {
      const w = fn(v, req);
      if (w) and.push(w);
    }
  }
  return and.length ? { AND: and } : {};
}

/**
 * Fabrique un routeur CRUD standard (liste paginée, détail, création, modification, suppression)
 * avec contrôle des droits, filtrage par habilitation et journalisation.
 */
export function crudRouter(options) {
  const {
    resource,            // clé de la matrice de permissions
    model,               // délégué Prisma (ex. "source")
    table,               // nom de table pour l'historique
    buildData,           // (body, ctx) => data Prisma
    include,             // include pour le détail
    listInclude,         // include pour la liste
    searchFields = [],   // champs de recherche texte (?q=)
    filters = {},        // { param: (valeur, req) => where }
    sortable = [],       // champs triables (?sort=&order=)
    defaultOrder = { id: 'desc' },
    scope,               // (user) => where (habilitation)
    serialize = (x) => x,
    beforeDelete,        // async (existing, req) => void
    afterDelete,         // async (existing, req) => void
    auditRead = false,   // journaliser la consultation du détail
    extend,              // (router) => void : routes supplémentaires (déclarées avant /:id)
  } = options;
  const router = Router();
  const delegate = prisma[model];

  const findScoped = (id, user, inc = include) =>
    delegate.findFirst({
      where: scope ? { AND: [{ id }, scope(user)] } : { id },
      include: inc,
    });

  if (extend) extend(router, { findScoped });

  router.get('/', authorize(resource, 'read'), async (req, res) => {
    const { page, pageSize, skip, take } = pagination(req.query);
    const where = buildWhere({ scope, searchFields, filters }, req);
    const sort = sortable.includes(req.query.sort) ? req.query.sort : null;
    const orderBy = sort ? { [sort]: req.query.order === 'asc' ? 'asc' : 'desc' } : defaultOrder;

    const [items, total] = await prisma.$transaction([
      delegate.findMany({ where, include: listInclude ?? include, orderBy, skip, take }),
      delegate.count({ where }),
    ]);
    res.json({ items: items.map(serialize), total, page, pageSize });
  });

  router.get('/:id', authorize(resource, 'read'), async (req, res) => {
    const id = toInt(req.params.id);
    const item = await findScoped(id, req.user);
    if (!item) throw notFound();
    if (auditRead) await audit(req, 'CONSULTATION', table, id);
    res.json(serialize(item));
  });

  router.post('/', authorize(resource, 'create'), async (req, res) => {
    const data = await buildData(req.body ?? {}, { req, isUpdate: false });
    const created = await delegate.create({ data, include });
    await audit(req, 'CREATION', table, created.id);
    res.status(201).json(serialize(created));
  });

  router.put('/:id', authorize(resource, 'update'), async (req, res) => {
    const id = toInt(req.params.id);
    const existing = await findScoped(id, req.user);
    if (!existing) throw notFound();
    const data = await buildData(req.body ?? {}, { req, isUpdate: true, existing });
    const updated = await delegate.update({ where: { id }, data, include });
    await audit(req, 'MODIFICATION', table, id);
    res.json(serialize(updated));
  });

  router.delete('/:id', authorize(resource, 'delete'), async (req, res) => {
    const id = toInt(req.params.id);
    const existing = await findScoped(id, req.user);
    if (!existing) throw notFound();
    if (beforeDelete) await beforeDelete(existing, req);
    await delegate.delete({ where: { id } });
    if (afterDelete) await afterDelete(existing, req);
    await audit(req, 'SUPPRESSION', table, id);
    res.status(204).end();
  });

  return router;
}
