import bcrypt from 'bcryptjs';
import { ROLES } from '../permissions.js';
import { crudRouter } from '../utils/crud.js';
import { badRequest, intInRange, oneOf, required, toStr } from '../utils/http.js';

export function checkPassword(pwd) {
  if (typeof pwd !== 'string' || pwd.length < 10 || !/[A-Za-z]/.test(pwd) || !/\d/.test(pwd)) {
    throw badRequest('Le mot de passe doit contenir au moins 10 caractères, dont des lettres et des chiffres');
  }
}

const serialize = ({ motDePasseHash, ...u }) => u;

export const utilisateurOptions = {
  resource: 'utilisateurs',
  model: 'utilisateur',
  table: 'utilisateur',
  serialize,
  searchFields: ['nom', 'prenom', 'email', 'service', 'grade'],
  sortable: ['nom', 'email', 'role', 'service', 'niveauHabilitation', 'statut', 'derniereConnexion'],
  defaultOrder: { nom: 'asc' },
  filters: {
    role: (v) => ({ role: oneOf(v, ROLES, 'Rôle') }),
    statut: (v) => ({ statut: oneOf(v, ['ACTIF', 'SUSPENDU'], 'Statut') }),
  },
  buildData: async (b, { req, isUpdate, existing }) => {
    required(b, ['nom', 'email', 'role']);
    const email = toStr(b.email).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Adresse e-mail invalide');

    const data = {
      nom: toStr(b.nom),
      prenom: toStr(b.prenom),
      grade: toStr(b.grade),
      role: oneOf(b.role, ROLES, 'Rôle'),
      service: toStr(b.service),
      niveauHabilitation: intInRange(b.niveauHabilitation, 1, 4, "Le niveau d'habilitation") ?? 1,
      email,
      statut: oneOf(b.statut, ['ACTIF', 'SUSPENDU'], 'Statut') ?? 'ACTIF',
    };

    if (isUpdate && existing.id === req.user.id) {
      if (data.role !== 'ADMIN' || data.statut !== 'ACTIF') {
        throw badRequest('Vous ne pouvez pas retirer vos propres droits administrateur ni suspendre votre compte');
      }
    }

    const pwd = toStr(b.motDePasse);
    if (!isUpdate || pwd) {
      checkPassword(pwd);
      data.motDePasseHash = await bcrypt.hash(pwd, 12);
    }
    return data;
  },
  beforeDelete: async (existing, req) => {
    if (existing.id === req.user.id) throw badRequest('Vous ne pouvez pas supprimer votre propre compte');
  },
};

export default crudRouter(utilisateurOptions);
