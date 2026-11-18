import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2, CalendarClock, ChevronDown, Database, FileText, FolderSearch, History, LayoutDashboard,
  LogOut, MapPin, Map as MapIcon, Menu, Moon, Network, Radio, Search, Shield, Sun, Tag, User, Users,
  Waypoints, Inbox, CalendarDays,
} from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../lib/api.js';
import { useDebounce, useDismiss } from '../lib/hooks.js';
import { CLASSIFICATIONS, ROLES, TYPES_ENTITE } from '../lib/labels.js';
import { fmtDate, fullName, initials } from '../lib/format.js';

const NAV = [
  {
    title: 'Pilotage',
    items: [{ to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true }],
  },
  {
    title: 'Exploitation',
    items: [
      { to: '/recherche', label: 'Recherche', icon: FolderSearch, perm: 'informations' },
      { to: '/entites', label: 'Dossiers entités', icon: Building2, perm: 'entites' },
      { to: '/reseau', label: 'Réseau relationnel', icon: Network, perm: 'liens' },
      { to: '/carte', label: 'Cartographie', icon: MapIcon, perm: 'localisations' },
      { to: '/chronologie', label: 'Chronologie', icon: CalendarClock, perm: 'evenements' },
    ],
  },
  {
    title: 'Gestion des données',
    items: [
      { to: '/sources', label: 'Sources', icon: Radio, perm: 'sources' },
      { to: '/collectes', label: 'Collectes', icon: Inbox, perm: 'collectes' },
      { to: '/evenements', label: 'Événements', icon: CalendarDays, perm: 'evenements' },
      { to: '/liens', label: 'Liens entre entités', icon: Waypoints, perm: 'liens' },
      { to: '/localisations', label: 'Localisations', icon: MapPin, perm: 'localisations' },
      { to: '/documents', label: 'Documents', icon: FileText, perm: 'documents' },
      { to: '/tags', label: 'Tags', icon: Tag, perm: 'tags' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { to: '/utilisateurs', label: 'Utilisateurs', icon: Users, perm: 'utilisateurs' },
      { to: '/historique', label: "Journal d'audit", icon: History, perm: 'audit' },
    ],
  },
];

function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch { /* ignore */ }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))];
}

function GlobalSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [res, setRes] = useState(null);
  const [active, setActive] = useState(0);
  const ref = useRef(null);
  const input = useRef(null);
  const dq = useDebounce(q, 250);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (dq.trim().length < 2) { setRes(null); return; }
    let alive = true;
    api.get('/recherche', { q: dq }).then((r) => alive && (setRes(r), setActive(0))).catch(() => {});
    return () => { alive = false; };
  }, [dq]);

  const groups = res ? [
    { label: 'Informations', items: res.informations.map((i) => ({ to: `/informations/${i.id}`, label: i.titre, meta: CLASSIFICATIONS[i.niveauClassification], icon: FileText })) },
    { label: 'Entités', items: res.entites.map((e) => ({ to: `/entites/${e.id}`, label: e.nom, meta: TYPES_ENTITE[e.typeEntite], icon: User })) },
    { label: 'Événements', items: res.evenements.map((e) => ({ to: `/chronologie`, label: e.titre, meta: fmtDate(e.dateDebut), icon: CalendarDays })) },
    { label: 'Sources', items: res.sources.map((s) => ({ to: `/sources`, label: s.nomSource, meta: s.typeSource, icon: Radio })) },
    { label: 'Lieux', items: res.localisations.map((l) => ({ to: `/carte?lieu=${l.id}`, label: l.nomLieu, meta: l.pays, icon: MapPin })) },
  ].filter((g) => g.items.length) : [];
  const flat = groups.flatMap((g) => g.items);

  const go = (to) => { setOpen(false); setQ(''); navigate(to); };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(flat.length - 1, a + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (flat[active]) go(flat[active].to);
      else if (q.trim()) go(`/recherche?q=${encodeURIComponent(q.trim())}`);
    }
  };

  let idx = -1;
  return (
    <div className="global-search" ref={ref} role="search">
      <div className="input-icon">
        <Search size={16} aria-hidden="true" />
        <input
          ref={input}
          type="search"
          className="input"
          placeholder="Rechercher une entité, une information…"
          aria-label="Recherche globale"
          aria-expanded={open && Boolean(res)}
          aria-controls="global-search-results"
          aria-autocomplete="list"
          role="combobox"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {!q && <kbd>Ctrl K</kbd>}
      </div>
      {open && res && (
        <div className="search-results" id="global-search-results" role="listbox">
          {!flat.length && <div className="empty" style={{ padding: 16 }}>Aucun résultat pour « {dq} »</div>}
          {groups.map((g) => (
            <div key={g.label} role="group" aria-label={g.label}>
              <div className="search-results__group">{g.label}</div>
              {g.items.map((it) => {
                idx += 1;
                const Icon = it.icon;
                const i = idx;
                return (
                  <Link key={it.to + it.label} to={it.to} role="option" aria-selected={i === active} onClick={(e) => { e.preventDefault(); go(it.to); }} onMouseEnter={() => setActive(i)}>
                    <Icon size={16} aria-hidden="true" className="muted" />
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
                    {it.meta && <span className="muted" style={{ fontSize: 12 }}>{it.meta}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
          {q.trim() && (
            <Link to={`/recherche?q=${encodeURIComponent(q.trim())}`} onClick={(e) => { e.preventDefault(); go(`/recherche?q=${encodeURIComponent(q.trim())}`); }} style={{ borderTop: '1px solid var(--border)', marginTop: 4 }}>
              <FolderSearch size={16} aria-hidden="true" /> Recherche avancée pour « {q.trim()} »
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <div className="user-menu" ref={ref}>
      <button type="button" className="user-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
        <span className="avatar" aria-hidden="true">{initials(user)}</span>
        <span className="user-btn__text">
          <strong>{fullName(user)}</strong>
          <small>{ROLES[user.role]}</small>
        </span>
        <ChevronDown size={16} aria-hidden="true" className="muted" />
      </button>
      {open && (
        <div className="dropdown" role="menu">
          <div style={{ padding: '8px 10px' }}>
            <div className="muted" style={{ fontSize: 12 }}>Habilitation</div>
            <span className={`badge classif classif--${user.niveauHabilitation}`}>{CLASSIFICATIONS[user.niveauHabilitation]}</span>
          </div>
          <hr />
          <Link to="/profil" role="menuitem" onClick={close}><User size={16} aria-hidden="true" /> Mon profil</Link>
          <button type="button" role="menuitem" onClick={async () => { await logout(); navigate('/connexion'); }}>
            <LogOut size={16} aria-hidden="true" /> Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}

export function Layout() {
  const { can } = useAuth();
  const [open, setOpen] = useState(false);
  const [theme, toggleTheme] = useTheme();
  const location = useLocation();
  const [aValider, setAValider] = useState(0);

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!can('informations', 'validate')) return;
    api.get('/informations', { statut: 'BRUT', pageSize: 1 }).then((r) => setAValider(r.total)).catch(() => {});
  }, [can, location.pathname]);

  return (
    <div className="app">
      <a href="#contenu" className="skip-link">Aller au contenu principal</a>

      <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Navigation principale">
        <div className="sidebar__brand">
          <span className="sidebar__logo" aria-hidden="true"><Shield size={18} /></span>
          <div>
            Sentinelle
            <small>Plateforme de renseignement</small>
          </div>
        </div>
        <nav>
          {NAV.map((group) => {
            const items = group.items.filter((i) => !i.perm || can(i.perm, 'read'));
            if (!items.length) return null;
            return (
              <div className="nav-group" key={group.title}>
                <div className="nav-group__title">{group.title}</div>
                {items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink key={to} to={to} end={end} className="nav-link">
                    <Icon size={18} aria-hidden="true" />
                    <span>{label}</span>
                    {to === '/recherche' && aValider > 0 && (
                      <span className="count" title={`${aValider} information(s) à valider`}>{aValider}</span>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="sidebar__footer">
          <Database size={12} aria-hidden="true" /> v1.0 · Données fictives de démonstration
        </div>
      </aside>
      <div className={`overlay ${open ? 'is-open' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />

      <div className="main">
        <header className="topbar">
          <button type="button" className="btn btn--ghost btn--icon topbar__menu" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
            <Menu size={20} />
          </button>
          <GlobalSearch />
          <span className="topbar__spacer" />
          <button type="button" className="btn btn--ghost btn--icon" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Activer le thème clair' : 'Activer le thème sombre'} title="Changer de thème">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <UserMenu />
        </header>
        <main id="contenu" className="content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
