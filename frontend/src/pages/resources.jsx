/**
 * Pages de gestion des tables, décrites par configuration
 * (colonnes du tableau, champs du formulaire, filtres).
 */
import { Link } from 'react-router-dom';
import { ResourcePage } from '../components/ResourcePage.jsx';
import { Badge, ClassifBadge, EntiteType, ImpactBadge, SourceCote } from '../components/ui.jsx';
import { useAuth } from '../lib/auth.jsx';
import {
  CLASSIFICATIONS, FIABILITE_CONTENU, FIABILITE_SOURCE, IMPACTS, ROLES, STATUTS_USER, TYPES_ENTITE,
  TYPES_SOURCE, TYPES_SOURCE_COURT, toOptions,
} from '../lib/labels.js';
import { fmtDate, fmtDateTime, fmtRelative, fullName } from '../lib/format.js';

const muted = (v) => v || <span className="muted">—</span>;
const entiteLabel = (e) => `${e.nom}${e.alias ? ` (${e.alias})` : ''} — ${TYPES_ENTITE[e.typeEntite]}`;

/* ---------------- Sources ---------------- */
export function SourcesPage() {
  return (
    <ResourcePage
      title="Sources"
      subtitle="Origine des informations, cotées selon la grille OTAN (A à F)."
      singular="une source"
      endpoint="/sources"
      resource="sources"
      exportKey="sources"
      defaultSort={{ key: 'nomSource', order: 'asc' }}
      searchPlaceholder="Rechercher une source…"
      columns={[
        { key: 'nomSource', label: 'Source', sortable: true, render: (r) => (
          <div><div className="cell-title">{r.nomSource}</div>{r.description && <div className="cell-sub truncate">{r.description}</div>}</div>
        ) },
        { key: 'typeSource', label: 'Type', sortable: true, render: (r) => <Badge tone="info">{TYPES_SOURCE_COURT[r.typeSource]}</Badge> },
        { key: 'fiabiliteSource', label: 'Cotation', sortable: true, render: (r) => (
          <span className="row"><SourceCote cote={r.fiabiliteSource} /> <span className="muted">{FIABILITE_SOURCE[r.fiabiliteSource].slice(4)}</span></span>
        ) },
        { key: 'collectes', label: 'Collectes', className: 'num', render: (r) => r._count?.collectes ?? 0 },
        { key: 'dateCreation', label: 'Créée le', sortable: true, render: (r) => fmtDate(r.dateCreation) },
      ]}
      filters={[
        { name: 'typeSource', label: 'Type de source', options: toOptions(TYPES_SOURCE_COURT) },
        { name: 'fiabiliteSource', label: 'Cotation', options: toOptions(FIABILITE_SOURCE) },
      ]}
      fields={[
        { name: 'nomSource', label: 'Nom de la source', required: true, span: 2, maxLength: 200 },
        { name: 'typeSource', label: 'Type de source', type: 'select', required: true, options: toOptions(TYPES_SOURCE), placeholder: '— Choisir —' },
        { name: 'fiabiliteSource', label: 'Fiabilité de la source', type: 'select', required: true, options: toOptions(FIABILITE_SOURCE), default: 'F', hint: 'Grille OTAN : A (totalement fiable) à F (inconnue)' },
        { name: 'lienContact', label: 'Lien / contact', span: 2, placeholder: 'URL, référence du contact…' },
        { name: 'description', label: 'Description', type: 'textarea' },
      ]}
    />
  );
}

/* ---------------- Collectes ---------------- */
export function CollectesPage() {
  return (
    <ResourcePage
      title="Collectes"
      subtitle="Opérations de recueil d'informations auprès des sources."
      singular="une collecte"
      endpoint="/collectes"
      resource="collectes"
      defaultSort={{ key: 'dateCollecte', order: 'desc' }}
      searchPlaceholder="Rechercher (méthode, source, commentaire)…"
      columns={[
        { key: 'dateCollecte', label: 'Date', sortable: true, render: (r) => fmtDateTime(r.dateCollecte) },
        { key: 'source', label: 'Source', render: (r) => (
          <span className="row"><span className="cell-title">{r.source?.nomSource}</span><SourceCote cote={r.source?.fiabiliteSource} /></span>
        ) },
        { key: 'methode', label: 'Méthode', sortable: true },
        { key: 'collectePar', label: 'Collecté par', render: (r) => muted(r.collectePar && fullName(r.collectePar)) },
        { key: 'informations', label: 'Informations', className: 'num', render: (r) => (
          r._count?.informations ? <Link to={`/recherche?collecteId=${r.id}`}>{r._count.informations}</Link> : 0
        ) },
      ]}
      fields={[
        { name: 'sourceId', label: 'Source', type: 'relation', endpoint: '/sources', labelOf: (s) => `${s.nomSource} (${s.typeSource} · ${s.fiabiliteSource})`, required: true, span: 2, fromItem: (i) => String(i.sourceId) },
        { name: 'methode', label: 'Méthode de collecte', required: true, suggestions: 'methodes', placeholder: 'Recherche web, entretien…' },
        { name: 'dateCollecte', label: 'Date de collecte', type: 'datetime', hint: 'Par défaut : maintenant' },
        { name: 'commentaire', label: 'Commentaire', type: 'textarea' },
      ]}
    />
  );
}

/* ---------------- Entités ---------------- */
export function EntitesPage() {
  return (
    <ResourcePage
      title="Dossiers entités"
      subtitle="Personnes, organisations, lieux et véhicules suivis. Cliquez sur une ligne pour ouvrir le dossier."
      singular="une entité"
      endpoint="/entites"
      resource="entites"
      exportKey="entites"
      defaultSort={{ key: 'nom', order: 'asc' }}
      rowLink={(r) => `/entites/${r.id}`}
      searchPlaceholder="Rechercher par nom, alias, nationalité…"
      columns={[
        { key: 'nom', label: 'Nom', sortable: true, render: (r) => (
          <div><Link to={`/entites/${r.id}`} className="cell-title">{r.nom}</Link>{r.alias && <div className="cell-sub">alias {r.alias}</div>}</div>
        ) },
        { key: 'typeEntite', label: 'Type', sortable: true, render: (r) => <EntiteType type={r.typeEntite} /> },
        { key: 'nationalite', label: 'Nationalité', sortable: true, render: (r) => muted(r.nationalite) },
        { key: 'localisation', label: 'Localisation', render: (r) => muted(r.localisation?.nomLieu) },
        { key: 'liens', label: 'Liens', className: 'num', render: (r) => (r._count?.liensSortants ?? 0) + (r._count?.liensEntrants ?? 0) },
        { key: 'infos', label: 'Infos', className: 'num', render: (r) => r._count?.informations ?? 0 },
      ]}
      filters={[{ name: 'typeEntite', label: "Type d'entité", options: toOptions(TYPES_ENTITE) }]}
      fields={entiteFields}
    />
  );
}

export const entiteFields = [
  { name: 'nom', label: 'Nom', required: true, maxLength: 200 },
  { name: 'typeEntite', label: "Type d'entité", type: 'select', required: true, options: toOptions(TYPES_ENTITE), placeholder: '— Choisir —' },
  { name: 'alias', label: 'Alias' },
  { name: 'nationalite', label: 'Nationalité', suggestions: 'nationalites' },
  { name: 'dateNaissance', label: 'Date de naissance', type: 'date', showIf: (v) => v.typeEntite === 'PERSONNE' },
  { name: 'localisationId', label: 'Localisation principale', type: 'relation', endpoint: '/localisations', labelOf: (l) => `${l.nomLieu}${l.pays ? ` (${l.pays})` : ''}`, fromItem: (i) => (i.localisationId ? String(i.localisationId) : '') },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'autresAttributs', label: 'Autres attributs (JSON)', type: 'json', rows: 3, placeholder: '{ "telephone": "…", "immatriculation": "…" }', validate: (v) => { try { JSON.parse(v); return null; } catch { return 'Format JSON invalide'; } } },
];

/* ---------------- Liens ---------------- */
export function LiensPage() {
  return (
    <ResourcePage
      title="Liens entre entités"
      subtitle="Relations orientées entre deux entités, avec leur période et leur fiabilité."
      singular="un lien"
      endpoint="/liens"
      resource="liens"
      exportKey="liens"
      searchPlaceholder="Rechercher (entité, type de lien, contexte)…"
      columns={[
        { key: 'entiteSource', label: 'Entité source', render: (r) => <Link to={`/entites/${r.entiteSource.id}`} className="cell-title">{r.entiteSource.nom}</Link> },
        { key: 'typeLien', label: 'Relation', sortable: true, render: (r) => <Badge tone="primary">{r.typeLien}</Badge> },
        { key: 'entiteCible', label: 'Entité cible', render: (r) => <Link to={`/entites/${r.entiteCible.id}`} className="cell-title">{r.entiteCible.nom}</Link> },
        { key: 'debutRelation', label: 'Période', sortable: true, render: (r) => `${fmtDate(r.debutRelation)} → ${r.finRelation ? fmtDate(r.finRelation) : 'en cours'}` },
        { key: 'fiabilite', label: 'Fiabilité', sortable: true, render: (r) => <span title={FIABILITE_CONTENU[r.fiabilite]}>{FIABILITE_CONTENU[r.fiabilite]}</span> },
      ]}
      fields={[
        { name: 'entiteSourceId', label: 'Entité source', type: 'relation', endpoint: '/entites', labelOf: entiteLabel, required: true, fromItem: (i) => String(i.entiteSourceId) },
        { name: 'entiteCibleId', label: 'Entité cible', type: 'relation', endpoint: '/entites', labelOf: entiteLabel, required: true, fromItem: (i) => String(i.entiteCibleId), validate: (v, all) => (v === all.entiteSourceId ? 'La cible doit être différente de la source' : null) },
        { name: 'typeLien', label: 'Type de lien', required: true, suggestions: 'typesLien', placeholder: 'travaille pour, finance, dirige…' },
        { name: 'fiabilite', label: 'Fiabilité du lien', type: 'select', options: toOptions(FIABILITE_CONTENU), default: '6' },
        { name: 'debutRelation', label: 'Début de la relation', type: 'date' },
        { name: 'finRelation', label: 'Fin de la relation', type: 'date', validate: (v, all) => (all.debutRelation && v < all.debutRelation ? 'La fin doit être postérieure au début' : null) },
        { name: 'contexte', label: 'Contexte', type: 'textarea' },
      ]}
    />
  );
}

/* ---------------- Localisations ---------------- */
export function LocalisationsPage() {
  return (
    <ResourcePage
      title="Localisations"
      subtitle="Lieux géoréférencés utilisés par les entités et les événements."
      singular="une localisation"
      endpoint="/localisations"
      resource="localisations"
      exportKey="localisations"
      defaultSort={{ key: 'nomLieu', order: 'asc' }}
      searchPlaceholder="Rechercher un lieu, un pays…"
      columns={[
        { key: 'nomLieu', label: 'Lieu', sortable: true, render: (r) => <Link to={`/carte?lieu=${r.id}`} className="cell-title">{r.nomLieu}</Link> },
        { key: 'typeLieu', label: 'Type', sortable: true, render: (r) => muted(r.typeLieu) },
        { key: 'pays', label: 'Pays', sortable: true, render: (r) => muted(r.pays) },
        { key: 'coords', label: 'Coordonnées', render: (r) => (r.latitude != null ? <span className="mono">{r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}</span> : <Badge tone="warning">Non géolocalisé</Badge>) },
        { key: 'evenements', label: 'Événements', className: 'num', render: (r) => r._count?.evenements ?? 0 },
        { key: 'entites', label: 'Entités', className: 'num', render: (r) => r._count?.entites ?? 0 },
      ]}
      fields={[
        { name: 'nomLieu', label: 'Nom du lieu', required: true, span: 2 },
        { name: 'typeLieu', label: 'Type de lieu', suggestions: 'typesLieu', placeholder: 'Ville, site, installation…' },
        { name: 'pays', label: 'Pays', suggestions: 'pays' },
        { name: 'latitude', label: 'Latitude', type: 'number', min: -90, max: 90, hint: 'Degrés décimaux, ex. -18.8792', validate: (v) => (Number(v) < -90 || Number(v) > 90 ? 'Entre -90 et 90' : null) },
        { name: 'longitude', label: 'Longitude', type: 'number', min: -180, max: 180, hint: 'Degrés décimaux, ex. 47.5079', validate: (v) => (Number(v) < -180 || Number(v) > 180 ? 'Entre -180 et 180' : null) },
        { name: 'description', label: 'Description', type: 'textarea' },
      ]}
    />
  );
}

/* ---------------- Événements ---------------- */
export function EvenementsPage() {
  return (
    <ResourcePage
      title="Événements"
      subtitle="Faits datés et localisés, reliés aux entités impliquées."
      singular="un événement"
      endpoint="/evenements"
      resource="evenements"
      exportKey="evenements"
      defaultSort={{ key: 'dateDebut', order: 'desc' }}
      searchPlaceholder="Rechercher un événement…"
      extraActions={<Link to="/chronologie" className="btn">Voir la chronologie</Link>}
      columns={[
        { key: 'dateDebut', label: 'Date', sortable: true, render: (r) => fmtDateTime(r.dateDebut) },
        { key: 'titre', label: 'Événement', sortable: true, render: (r) => (
          <div><div className="cell-title">{r.titre}</div><div className="cell-sub">{r.typeEvenement}</div></div>
        ) },
        { key: 'localisation', label: 'Lieu', render: (r) => muted(r.localisation?.nomLieu) },
        { key: 'entites', label: 'Entités impliquées', render: (r) => (r.entites?.length ? (
          <span className="row">{r.entites.slice(0, 3).map((e) => <Link key={e.id} to={`/entites/${e.id}`}>{e.nom}</Link>)}{r.entites.length > 3 && <span className="muted">+{r.entites.length - 3}</span>}</span>
        ) : <span className="muted">—</span>) },
        { key: 'impact', label: 'Impact', sortable: true, render: (r) => <ImpactBadge impact={r.impact} /> },
      ]}
      filters={[
        { name: 'impact', label: 'Impact', options: toOptions(IMPACTS) },
        { name: 'dateFrom', label: 'À partir du', type: 'date' },
        { name: 'dateTo', label: "Jusqu'au", type: 'date' },
      ]}
      fields={[
        { name: 'titre', label: 'Titre', required: true, span: 2 },
        { name: 'dateDebut', label: 'Date de début', type: 'datetime', required: true },
        { name: 'dateFin', label: 'Date de fin', type: 'datetime', validate: (v, all) => (all.dateDebut && v < all.dateDebut ? 'La fin doit être postérieure au début' : null) },
        { name: 'typeEvenement', label: "Type d'événement", suggestions: 'typesEvenement', placeholder: 'Rencontre, maritime, financier…' },
        { name: 'impact', label: 'Impact', type: 'select', options: toOptions(IMPACTS) },
        { name: 'localisationId', label: 'Lieu', type: 'relation', endpoint: '/localisations', labelOf: (l) => `${l.nomLieu}${l.pays ? ` (${l.pays})` : ''}`, fromItem: (i) => (i.localisationId ? String(i.localisationId) : '') },
        { name: 'infoId', label: 'Information source', type: 'relation', endpoint: '/informations', labelOf: (i) => `#${i.id} — ${i.titre}`, fromItem: (i) => (i.infoId ? String(i.infoId) : '') },
        { name: 'entiteIds', label: 'Entités impliquées', type: 'multirelation', endpoint: '/entites', labelOf: entiteLabel, fromItem: (i) => (i.entites || []).map((e) => String(e.id)) },
        { name: 'description', label: 'Description', type: 'textarea' },
      ]}
    />
  );
}

/* ---------------- Tags ---------------- */
export function TagsPage() {
  return (
    <ResourcePage
      title="Tags"
      subtitle="Mots-clés de classement des informations."
      singular="un tag"
      endpoint="/tags"
      resource="tags"
      defaultSort={{ key: 'nomTag', order: 'asc' }}
      searchPlaceholder="Rechercher un tag…"
      columns={[
        { key: 'nomTag', label: 'Tag', sortable: true, render: (r) => <Badge tone="primary">{r.nomTag}</Badge> },
        { key: 'categorie', label: 'Catégorie', sortable: true, render: (r) => muted(r.categorie) },
        { key: 'infos', label: 'Informations', className: 'num', render: (r) => (r._count?.infos ? <Link to={`/recherche?tagId=${r.id}`}>{r._count.infos}</Link> : 0) },
      ]}
      fields={[
        { name: 'nomTag', label: 'Nom du tag', required: true, maxLength: 100 },
        { name: 'categorie', label: 'Catégorie', suggestions: 'categoriesTag', placeholder: 'Thématique, zone, priorité…' },
      ]}
    />
  );
}

/* ---------------- Utilisateurs ---------------- */
export function UtilisateursPage() {
  const { user } = useAuth();
  return (
    <ResourcePage
      title="Utilisateurs"
      subtitle="Comptes, rôles et niveaux d'habilitation."
      singular="un utilisateur"
      endpoint="/utilisateurs"
      resource="utilisateurs"
      defaultSort={{ key: 'nom', order: 'asc' }}
      searchPlaceholder="Rechercher un utilisateur…"
      canEditRow={() => true}
      columns={[
        { key: 'nom', label: 'Utilisateur', sortable: true, render: (r) => (
          <div><div className="cell-title">{fullName(r)} {r.id === user.id && <Badge tone="info">Vous</Badge>}</div><div className="cell-sub">{r.email}</div></div>
        ) },
        { key: 'role', label: 'Rôle', sortable: true, render: (r) => ROLES[r.role] },
        { key: 'service', label: 'Service', sortable: true, render: (r) => (
          <div>{muted(r.service)}{r.grade && <div className="cell-sub">{r.grade}</div>}</div>
        ) },
        { key: 'niveauHabilitation', label: 'Habilitation', sortable: true, render: (r) => <ClassifBadge niveau={r.niveauHabilitation} /> },
        { key: 'statut', label: 'Statut', sortable: true, render: (r) => <Badge tone={r.statut === 'ACTIF' ? 'success' : 'danger'} dot>{STATUTS_USER[r.statut]}</Badge> },
        { key: 'derniereConnexion', label: 'Dernière connexion', sortable: true, render: (r) => (r.derniereConnexion ? <span title={fmtDateTime(r.derniereConnexion)}>{fmtRelative(r.derniereConnexion)}</span> : <span className="muted">Jamais</span>) },
      ]}
      filters={[
        { name: 'role', label: 'Rôle', options: toOptions(ROLES) },
        { name: 'statut', label: 'Statut', options: toOptions(STATUTS_USER) },
      ]}
      fields={(item) => [
        { name: 'prenom', label: 'Prénom' },
        { name: 'nom', label: 'Nom', required: true },
        { name: 'email', label: 'Adresse e-mail', type: 'email', required: true, span: 2, autoComplete: 'off', validate: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Adresse e-mail invalide') },
        { name: 'grade', label: 'Grade / fonction' },
        { name: 'service', label: 'Service', suggestions: 'services' },
        { name: 'role', label: 'Rôle', type: 'select', required: true, options: toOptions(ROLES), default: 'ANALYSTE' },
        { name: 'niveauHabilitation', label: "Niveau d'habilitation", type: 'select', required: true, options: toOptions(CLASSIFICATIONS), default: '1' },
        { name: 'statut', label: 'Statut du compte', type: 'select', required: true, options: toOptions(STATUTS_USER), default: 'ACTIF' },
        {
          name: 'motDePasse',
          label: item ? 'Nouveau mot de passe' : 'Mot de passe',
          type: 'password',
          required: !item,
          hint: item ? 'Laisser vide pour conserver le mot de passe actuel' : 'Au moins 10 caractères, lettres et chiffres',
          validate: (v) => (v.length < 10 || !/[A-Za-z]/.test(v) || !/\d/.test(v) ? 'Au moins 10 caractères, dont des lettres et des chiffres' : null),
        },
      ]}
    />
  );
}
