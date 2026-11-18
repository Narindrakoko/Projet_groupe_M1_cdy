import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authorize } from '../middleware/auth.js';
import { can } from '../permissions.js';
import { audit } from '../utils/audit.js';
import { buildWhere } from '../utils/crud.js';
import { badRequest, forbidden } from '../utils/http.js';
import { informationOptions } from './informations.js';
import { entiteOptions } from './entites.js';
import { evenementOptions } from './evenements.js';
import { lienOptions } from './liens.js';
import { sourceOptions } from './sources.js';
import { localisationOptions } from './localisations.js';
import { historiqueInclude, historiqueOptions } from './historique.js';

const router = Router();

const d = (v) => (v ? new Date(v).toISOString().slice(0, 10) : '');
const dt = (v) => (v ? new Date(v).toISOString().replace('T', ' ').slice(0, 16) : '');
const CLASSIF = { 1: 'Non protégé', 2: 'Diffusion restreinte', 3: 'Confidentiel', 4: 'Secret' };

/** Définition des exports : options de filtrage + colonnes. */
const EXPORTS = {
  informations: {
    options: informationOptions,
    include: { collecte: { include: { source: true } }, tags: { include: { tag: true } } },
    columns: [
      ['ID', (r) => r.id],
      ['Titre', (r) => r.titre],
      ['Type', (r) => r.typeInfo],
      ['Statut', (r) => r.statut],
      ['Classification', (r) => CLASSIF[r.niveauClassification]],
      ['Fiabilité contenu', (r) => r.fiabiliteContenu],
      ['Source', (r) => r.collecte?.source?.nomSource ?? ''],
      ['Cotation source', (r) => r.collecte?.source?.fiabiliteSource ?? ''],
      ['Date événement', (r) => d(r.dateEvenement)],
      ['Date enregistrement', (r) => dt(r.dateEnregistrement)],
      ['Tags', (r) => r.tags.map((t) => t.tag.nomTag).join(', ')],
      ['Contenu', (r) => r.contenuTexte ?? ''],
    ],
  },
  entites: {
    options: entiteOptions,
    include: { localisation: true },
    columns: [
      ['ID', (r) => r.id],
      ['Type', (r) => r.typeEntite],
      ['Nom', (r) => r.nom],
      ['Alias', (r) => r.alias ?? ''],
      ['Nationalité', (r) => r.nationalite ?? ''],
      ['Date de naissance', (r) => d(r.dateNaissance)],
      ['Localisation', (r) => r.localisation?.nomLieu ?? ''],
      ['Description', (r) => r.description ?? ''],
    ],
  },
  evenements: {
    options: evenementOptions,
    include: { localisation: true },
    columns: [
      ['ID', (r) => r.id],
      ['Titre', (r) => r.titre],
      ['Type', (r) => r.typeEvenement ?? ''],
      ['Début', (r) => dt(r.dateDebut)],
      ['Fin', (r) => dt(r.dateFin)],
      ['Impact', (r) => r.impact ?? ''],
      ['Lieu', (r) => r.localisation?.nomLieu ?? ''],
      ['Description', (r) => r.description ?? ''],
    ],
  },
  liens: {
    options: lienOptions,
    include: { entiteSource: true, entiteCible: true },
    columns: [
      ['ID', (r) => r.id],
      ['Entité source', (r) => r.entiteSource.nom],
      ['Type de lien', (r) => r.typeLien],
      ['Entité cible', (r) => r.entiteCible.nom],
      ['Début', (r) => d(r.debutRelation)],
      ['Fin', (r) => d(r.finRelation)],
      ['Fiabilité', (r) => r.fiabilite],
      ['Contexte', (r) => r.contexte ?? ''],
    ],
  },
  sources: {
    options: sourceOptions,
    columns: [
      ['ID', (r) => r.id],
      ['Nom', (r) => r.nomSource],
      ['Type', (r) => r.typeSource],
      ['Cotation', (r) => r.fiabiliteSource],
      ['Contact', (r) => r.lienContact ?? ''],
      ['Créée le', (r) => d(r.dateCreation)],
      ['Description', (r) => r.description ?? ''],
    ],
  },
  localisations: {
    options: localisationOptions,
    columns: [
      ['ID', (r) => r.id],
      ['Lieu', (r) => r.nomLieu],
      ['Type', (r) => r.typeLieu ?? ''],
      ['Pays', (r) => r.pays ?? ''],
      ['Latitude', (r) => r.latitude ?? ''],
      ['Longitude', (r) => r.longitude ?? ''],
    ],
  },
  historique: {
    options: {
      ...historiqueOptions,
      resource: 'audit',
      model: 'historiqueAction',
      table: 'historique_action',
      defaultOrder: { dateAction: 'desc' },
    },
    include: historiqueInclude,
    columns: [
      ['Date', (r) => dt(r.dateAction)],
      ['Utilisateur', (r) => (r.utilisateur ? `${r.utilisateur.prenom ?? ''} ${r.utilisateur.nom}`.trim() : '')],
      ['Action', (r) => r.action],
      ['Table', (r) => r.tableConcernee ?? ''],
      ['ID enregistrement', (r) => r.idEnregistrement ?? ''],
      ['Adresse IP', (r) => r.adresseIp ?? ''],
      ['Détails', (r) => r.details ?? ''],
    ],
  },
};

function csvCell(v) {
  const s = String(v ?? '');
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Export CSV (séparateur « ; » + BOM UTF-8 pour Excel en français). */
router.get('/:resource', authorize('export', 'read'), async (req, res) => {
  const def = EXPORTS[req.params.resource];
  if (!def) throw badRequest('Export inconnu');
  const { options } = def;
  if (!can(req.user.role, options.resource, 'read')) throw forbidden();

  const where = buildWhere(options, req);
  const rows = await prisma[options.model].findMany({
    where,
    include: def.include,
    orderBy: options.defaultOrder,
    take: 10000,
  });

  const lines = [def.columns.map(([h]) => csvCell(h)).join(';')];
  for (const r of rows) lines.push(def.columns.map(([, fn]) => csvCell(fn(r))).join(';'));

  await audit(req, 'EXPORT', options.table, null, `${rows.length} ligne(s) — filtres : ${JSON.stringify(req.query)}`);

  const filename = `export_${req.params.resource}_${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('﻿' + lines.join('\r\n'));
});

export default router;
