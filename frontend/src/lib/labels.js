/** Libellés et codes couleur des valeurs d'énumération. */

export const ROLES = {
  ADMIN: 'Administrateur',
  RESPONSABLE: 'Responsable',
  ANALYSTE: 'Analyste',
  DECIDEUR: 'Décideur',
  OPERATEUR: 'Opérateur terrain',
};

export const CLASSIFICATIONS = {
  1: 'Non protégé',
  2: 'Diffusion restreinte',
  3: 'Confidentiel',
  4: 'Secret',
};

export const STATUTS_INFO = { BRUT: 'Brut', VALIDE: 'Validé', ARCHIVE: 'Archivé' };
export const STATUT_TONE = { BRUT: 'warning', VALIDE: 'success', ARCHIVE: 'neutral' };

export const TYPES_INFO = { TEXTE: 'Texte', DOCUMENT: 'Document', IMAGE: 'Image', VIDEO: 'Vidéo', AUDIO: 'Audio', AUTRE: 'Autre' };

export const TYPES_SOURCE = {
  OSINT: 'OSINT — sources ouvertes',
  HUMINT: 'HUMINT — source humaine',
  SIGINT: 'SIGINT — électromagnétique',
  IMINT: 'IMINT — imagerie',
  AUTRE: 'Autre',
};
export const TYPES_SOURCE_COURT = { OSINT: 'OSINT', HUMINT: 'HUMINT', SIGINT: 'SIGINT', IMINT: 'IMINT', AUTRE: 'Autre' };

/** Grille OTAN (Amirauté) — fiabilité de la source */
export const FIABILITE_SOURCE = {
  A: 'A — Totalement fiable',
  B: 'B — Habituellement fiable',
  C: 'C — Assez fiable',
  D: 'D — Pas toujours fiable',
  E: 'E — Peu fiable',
  F: 'F — Fiabilité inconnue',
};

/** Grille OTAN — crédibilité de l'information */
export const FIABILITE_CONTENU = {
  1: '1 — Confirmée',
  2: '2 — Probable',
  3: '3 — Possible',
  4: '4 — Douteuse',
  5: '5 — Improbable',
  6: '6 — Non évaluable',
};

export const TYPES_ENTITE = { PERSONNE: 'Personne', ORGANISATION: 'Organisation', LIEU: 'Lieu', VEHICULE: 'Véhicule', AUTRE: 'Autre' };

/** Couleurs des types d'entité (graphe, carte, badges) */
export const ENTITE_COLORS = {
  PERSONNE: '#2563eb',
  ORGANISATION: '#d97706',
  LIEU: '#059669',
  VEHICULE: '#7c3aed',
  AUTRE: '#64748b',
};

export const IMPACTS = { FAIBLE: 'Faible', MOYEN: 'Moyen', ELEVE: 'Élevé', CRITIQUE: 'Critique' };
export const IMPACT_TONE = { FAIBLE: 'success', MOYEN: 'info', ELEVE: 'warning', CRITIQUE: 'danger' };
export const IMPACT_COLORS = { FAIBLE: '#15803d', MOYEN: '#0369a1', ELEVE: '#d97706', CRITIQUE: '#b91c1c' };

export const ACTIONS_AUDIT = {
  CONNEXION: 'Connexion',
  ECHEC_CONNEXION: 'Échec de connexion',
  DECONNEXION: 'Déconnexion',
  CONSULTATION: 'Consultation',
  CREATION: 'Création',
  MODIFICATION: 'Modification',
  SUPPRESSION: 'Suppression',
  EXPORT: 'Export',
  TELECHARGEMENT: 'Téléchargement',
};
export const ACTION_TONE = {
  CONNEXION: 'info',
  ECHEC_CONNEXION: 'danger',
  DECONNEXION: 'neutral',
  CONSULTATION: 'neutral',
  CREATION: 'success',
  MODIFICATION: 'primary',
  SUPPRESSION: 'danger',
  EXPORT: 'warning',
  TELECHARGEMENT: 'warning',
};

export const STATUTS_USER = { ACTIF: 'Actif', SUSPENDU: 'Suspendu' };

export const toOptions = (obj) => Object.entries(obj).map(([value, label]) => ({ value, label }));
