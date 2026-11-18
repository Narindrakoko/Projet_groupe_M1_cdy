import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authorize } from '../middleware/auth.js';
import { buildWhere } from '../utils/crud.js';
import { pagination, toDate, toInt } from '../utils/http.js';

const router = Router();

export const historiqueOptions = {
  searchFields: ['details', 'tableConcernee', 'utilisateur.nom', 'utilisateur.email'],
  filters: {
    userId: (v) => ({ userId: toInt(v) }),
    action: (v) => ({ action: { in: String(v).split(',') } }),
    tableConcernee: (v) => ({ tableConcernee: v }),
    dateFrom: (v) => ({ dateAction: { gte: toDate(v) } }),
    dateTo: (v) => {
      const d = toDate(v);
      d.setHours(23, 59, 59, 999);
      return { dateAction: { lte: d } };
    },
  },
};

export const historiqueInclude = {
  utilisateur: { select: { id: true, nom: true, prenom: true, email: true, role: true } },
};

router.get('/', authorize('audit', 'read'), async (req, res) => {
  const { page, pageSize, skip, take } = pagination(req.query);
  const where = buildWhere(historiqueOptions, req);
  const [items, total] = await prisma.$transaction([
    prisma.historiqueAction.findMany({ where, include: historiqueInclude, orderBy: { dateAction: 'desc' }, skip, take }),
    prisma.historiqueAction.count({ where }),
  ]);
  res.json({ items, total, page, pageSize });
});

export default router;
