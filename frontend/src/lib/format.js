const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const longDateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const numFmt = new Intl.NumberFormat('fr-FR');

const valid = (v) => v && !Number.isNaN(new Date(v).getTime());

export const fmtDate = (v) => (valid(v) ? dateFmt.format(new Date(v)) : '—');
export const fmtDateTime = (v) => (valid(v) ? dateTimeFmt.format(new Date(v)) : '—');
export const fmtLongDate = (v) => (valid(v) ? longDateFmt.format(new Date(v)) : '—');
export const fmtMonth = (v) => (valid(v) ? monthFmt.format(new Date(v)) : '—');
export const fmtNum = (v) => numFmt.format(v ?? 0);

export function fmtSize(bytes) {
  if (bytes === null || bytes === undefined) return '—';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i ? 1 : 0).replace('.', ',')} ${units[i]}`;
}

export function fmtRelative(v) {
  if (!valid(v)) return '—';
  const diff = (Date.now() - new Date(v).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
  const steps = [[60, 'second', 1], [3600, 'minute', 60], [86400, 'hour', 3600], [604800, 'day', 86400], [2629800, 'week', 604800], [31557600, 'month', 2629800]];
  for (const [limit, unit, div] of steps) {
    if (Math.abs(diff) < limit) return rtf.format(-Math.round(diff / div), unit);
  }
  return rtf.format(-Math.round(diff / 31557600), 'year');
}

/** Valeur pour <input type="date"> */
export const toInputDate = (v) => (valid(v) ? new Date(v).toISOString().slice(0, 10) : '');

/** Valeur pour <input type="datetime-local"> (heure locale) */
export function toInputDateTime(v) {
  if (!valid(v)) return '';
  const d = new Date(v);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export const fullName = (u) => (u ? [u.prenom, u.nom].filter(Boolean).join(' ') : '—');
export const initials = (u) => (u ? `${(u.prenom || '')[0] || ''}${(u.nom || '')[0] || ''}`.toUpperCase() || '?' : '?');
