import { CLASSIFICATIONS, FIABILITE_CONTENU, STATUTS_INFO, TYPES_ENTITE, TYPES_INFO, toOptions } from '../lib/labels.js';
import { fmtDate } from '../lib/format.js';

/** Champs du formulaire « information », adaptés aux droits de l'utilisateur. */
export function informationFields(user, can) {
  const classifs = toOptions(CLASSIFICATIONS).filter((o) => Number(o.value) <= user.niveauHabilitation);
  const fields = [
    { name: 'titre', label: 'Titre', required: true, span: 2, maxLength: 255 },
    { name: 'typeInfo', label: "Type d'information", type: 'select', required: true, options: toOptions(TYPES_INFO), default: 'TEXTE' },
    { name: 'dateEvenement', label: 'Date des faits', type: 'datetime' },
    {
      name: 'collecteId',
      label: 'Collecte d\'origine',
      type: 'relation',
      endpoint: '/collectes',
      labelOf: (c) => `${fmtDate(c.dateCollecte)} — ${c.source?.nomSource ?? 'Source'} (${c.methode})`,
      fromItem: (i) => (i.collecteId ? String(i.collecteId) : ''),
      span: 2,
      hint: 'Permet de remonter à la source et à sa cotation',
    },
    { name: 'fiabiliteContenu', label: 'Crédibilité du contenu', type: 'select', required: true, options: toOptions(FIABILITE_CONTENU), default: '6', hint: 'Grille OTAN : 1 (confirmée) à 6 (non évaluable)' },
    { name: 'niveauClassification', label: 'Niveau de classification', type: 'select', required: true, options: classifs, default: '1', hint: `Limité à votre habilitation (${CLASSIFICATIONS[user.niveauHabilitation]})` },
  ];
  if (can('informations', 'validate')) {
    fields.push({ name: 'statut', label: 'Statut', type: 'select', required: true, options: toOptions(STATUTS_INFO), default: 'BRUT' });
  }
  fields.push(
    { name: 'contenuTexte', label: 'Contenu', type: 'textarea', rows: 7 },
    { name: 'tagIds', label: 'Tags', type: 'multirelation', endpoint: '/tags', labelOf: (t) => t.nomTag, fromItem: (i) => (i.tags || []).map((t) => String(t.id)) },
    {
      name: 'entiteIds',
      label: 'Entités concernées',
      type: 'multirelation',
      endpoint: '/entites',
      labelOf: (e) => `${e.nom} — ${TYPES_ENTITE[e.typeEntite]}`,
      fromItem: (i) => (i.entites || []).map((e) => String(e.id)),
    },
  );
  return fields;
}
