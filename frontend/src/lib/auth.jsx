import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, setUnauthorizedHandler, tokenStore } from './api.js';
import { Loading } from '../components/ui.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(async ({ silent = false } = {}) => {
    if (!silent && tokenStore.get()) {
      try { await api.post('/auth/logout'); } catch { /* ignore */ }
    }
    tokenStore.set(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.set(null);
      setUser(null);
    });
    if (!tokenStore.get()) {
      setReady(true);
      return;
    }
    api.get('/auth/me')
      .then(setUser)
      .catch(() => tokenStore.set(null))
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (email, motDePasse) => {
    const { token, user: u } = await api.post('/auth/login', { email, motDePasse });
    tokenStore.set(token);
    setUser(u);
    return u;
  }, []);

  /** Vérifie un droit : can('informations', 'create') */
  const can = useCallback((resource, action = 'read') => Boolean(user?.permissions?.[resource]?.[action]), [user]);

  const value = useMemo(() => ({ user, ready, login, logout, can, setUser }), [user, ready, login, logout, can]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

/** Protège une route : redirige vers la connexion, ou affiche un refus d'accès. */
export function RequireAuth({ children, resource, action = 'read' }) {
  const { user, ready, can } = useAuth();
  const location = useLocation();
  if (!ready) return <Loading label="Chargement de la session…" />;
  if (!user) return <Navigate to="/connexion" replace state={{ from: location }} />;
  if (resource && !can(resource, action)) return <Navigate to="/acces-refuse" replace />;
  return children;
}
