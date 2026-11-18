/**
 * Matrice des droits par rôle — source unique de vérité,
 * transmise au frontend via /api/auth/me.
 */
export const ROLES = ['ADMIN', 'RESPONSABLE', 'ANALYSTE', 'DECIDEUR', 'OPERATEUR'];

const ALL = ROLES;
const SAISIE = ['ADMIN', 'RESPONSABLE', 'ANALYSTE', 'OPERATEUR'];
const ANALYSE = ['ADMIN', 'RESPONSABLE', 'ANALYSTE'];
const GESTION = ['ADMIN', 'RESPONSABLE'];

export const PERMISSIONS = {
  sources:       { read: ALL, create: SAISIE,  update: ANALYSE, delete: GESTION },
  collectes:     { read: ALL, create: SAISIE,  update: ANALYSE, delete: GESTION },
  informations:  { read: ALL, create: SAISIE,  update: ANALYSE, delete: GESTION, validate: GESTION },
  entites:       { read: ALL, create: ANALYSE, update: ANALYSE, delete: GESTION },
  liens:         { read: ALL, create: ANALYSE, update: ANALYSE, delete: GESTION },
  localisations: { read: ALL, create: ANALYSE, update: ANALYSE, delete: GESTION },
  evenements:    { read: ALL, create: ANALYSE, update: ANALYSE, delete: GESTION },
  documents:     { read: ALL, create: SAISIE,  update: ANALYSE, delete: GESTION },
  tags:          { read: ALL, create: ANALYSE, update: ANALYSE, delete: GESTION },
  utilisateurs:  { read: ['ADMIN'], create: ['ADMIN'], update: ['ADMIN'], delete: ['ADMIN'] },
  audit:         { read: GESTION },
  export:        { read: ['ADMIN', 'RESPONSABLE', 'ANALYSTE', 'DECIDEUR'] },
};

export function can(role, resource, action) {
  return Boolean(PERMISSIONS[resource]?.[action]?.includes(role));
}

/** Droits effectifs d'un rôle, sous forme { ressource: { action: bool } } */
export function permissionsFor(role) {
  const out = {};
  for (const [res, actions] of Object.entries(PERMISSIONS)) {
    out[res] = {};
    for (const [act, roles] of Object.entries(actions)) out[res][act] = roles.includes(role);
  }
  return out;
}
