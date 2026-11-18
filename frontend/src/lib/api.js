const TOKEN_KEY = 'auth_token';

/** Le jeton est conservé le temps de l'onglet (sessionStorage), pas au-delà. */
export const tokenStore = {
  get: () => {
    try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (t) => {
    try {
      if (t) sessionStorage.setItem(TOKEN_KEY, t);
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch { /* stockage indisponible */ }
  },
};

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

/** Construit une chaîne de requête en ignorant les valeurs vides. */
export function qs(params = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
    p.set(k, Array.isArray(v) ? v.join(',') : v);
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export async function request(path, { method = 'GET', body, raw = false } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Impossible de joindre le serveur. Vérifiez que l'API est démarrée.");
  }

  if (res.status === 401 && !path.startsWith('/auth/login')) onUnauthorized();
  if (!res.ok) {
    let data = {};
    try { data = await res.json(); } catch { /* corps non JSON */ }
    throw new ApiError(res.status, data.error || `Erreur ${res.status}`, data.details);
  }
  if (raw) return res;
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path, params) => request(path + qs(params)),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};

/** Télécharge un fichier protégé (export CSV, document) en conservant l'authentification. */
export async function download(path, fallbackName = 'fichier') {
  const res = await request(path, { raw: true });
  const cd = res.headers.get('Content-Disposition') || '';
  const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  const plain = /filename="?([^";]+)"?/i.exec(cd);
  const name = star ? decodeURIComponent(star[1]) : plain ? plain[1] : fallbackName;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
