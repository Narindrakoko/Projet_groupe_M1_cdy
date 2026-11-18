import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

/** Charge une ressource API et expose { data, error, loading, reload }. */
export function useFetch(path, params, { enabled = true, refreshKey = 0 } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: enabled });
  const key = path + JSON.stringify(params ?? {}) + refreshKey;
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!enabled || !path) return;
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api.get(path, params);
      if (id === seq.current) setState({ data, error: null, loading: false });
    } catch (error) {
      if (id === seq.current) setState((s) => ({ ...s, error, loading: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

const optionsCache = new Map();

/** Liste d'options pour les listes déroulantes (mise en cache le temps de la session). */
export function useOptions(endpoint, { labelOf, enabled = true } = {}) {
  const [items, setItems] = useState(() => optionsCache.get(endpoint) || []);
  const [loading, setLoading] = useState(!optionsCache.has(endpoint));

  useEffect(() => {
    if (!endpoint || !enabled) return;
    let alive = true;
    api.get(endpoint, { pageSize: 1000 })
      .then((res) => {
        const list = res.items ?? res;
        optionsCache.set(endpoint, list);
        if (alive) setItems(list);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [endpoint, enabled]);

  const options = items.map((it) => ({ value: String(it.id), label: labelOf ? labelOf(it) : it.nom ?? it.titre ?? String(it.id), item: it }));
  return { options, loading };
}

export const invalidateOptions = (endpoint) => (endpoint ? optionsCache.delete(endpoint) : optionsCache.clear());

export function useDebounce(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/** Met à jour le titre de l'onglet. */
export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — Sentinelle` : 'Sentinelle — Plateforme de renseignement';
  }, [title]);
}

/** Ferme un élément lors d'un clic à l'extérieur ou de la touche Échap. */
export function useDismiss(ref, open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, open, onClose]);
}
