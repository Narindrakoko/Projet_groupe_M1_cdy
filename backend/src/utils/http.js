export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (msg, details) => new HttpError(400, msg, details);
export const notFound = (msg = 'Ressource introuvable') => new HttpError(404, msg);
export const forbidden = (msg = 'Accès refusé') => new HttpError(403, msg);

/** Convertit une valeur en entier, ou null si vide. */
export function toInt(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isInteger(n)) throw badRequest(`Valeur entière invalide : ${v}`);
  return n;
}

export function toFloat(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (Number.isNaN(n)) throw badRequest(`Valeur numérique invalide : ${v}`);
  return n;
}

export function toDate(v) {
  if (v === undefined || v === null || v === '') return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw badRequest(`Date invalide : ${v}`);
  return d;
}

export function toStr(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

export function required(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === '');
  if (missing.length) throw badRequest('Champs obligatoires manquants', { champs: missing });
}

export function oneOf(v, values, label) {
  if (v === null || v === undefined || v === '') return null;
  if (!values.includes(v)) throw badRequest(`${label} invalide : ${v}`);
  return v;
}

export function intInRange(v, min, max, label) {
  const n = toInt(v);
  if (n === null) return null;
  if (n < min || n > max) throw badRequest(`${label} doit être compris entre ${min} et ${max}`);
  return n;
}

/** Pagination standard : ?page=1&pageSize=20 */
export function pagination(query, maxSize = 1000) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(maxSize, Math.max(1, Number(query.pageSize) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** Garde uniquement les clés définies (pour les mises à jour partielles). */
export function compact(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

/** Liste d'identifiants entiers depuis un tableau / une chaîne "1,2,3". */
export function toIdList(v) {
  if (v === undefined || v === null || v === '') return [];
  const arr = Array.isArray(v) ? v : String(v).split(',');
  return [...new Set(arr.map((x) => toInt(typeof x === 'object' ? x.id : x)).filter((x) => x !== null))];
}
