import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CircleAlert, Inbox, X } from 'lucide-react';
import {
  CLASSIFICATIONS, ENTITE_COLORS, FIABILITE_CONTENU, FIABILITE_SOURCE, IMPACTS, IMPACT_TONE,
  STATUTS_INFO, STATUT_TONE, TYPES_ENTITE,
} from '../lib/labels.js';

/* ---------- Badges métier ---------- */

export function Badge({ tone = 'neutral', dot, square, children, title }) {
  const cls = ['badge', tone !== 'neutral' && `badge--${tone}`, dot && 'badge--dot', square && 'badge--square'].filter(Boolean).join(' ');
  return <span className={cls} title={title}>{children}</span>;
}

export const ClassifBadge = ({ niveau }) => (
  <span className={`badge classif classif--${niveau}`} title={`Classification : ${CLASSIFICATIONS[niveau]}`}>
    {CLASSIFICATIONS[niveau] ?? '—'}
  </span>
);

export const StatutBadge = ({ statut }) => <Badge tone={STATUT_TONE[statut]} dot>{STATUTS_INFO[statut] ?? statut}</Badge>;

export const ImpactBadge = ({ impact }) =>
  impact ? <Badge tone={IMPACT_TONE[impact]} dot>{IMPACTS[impact]}</Badge> : <span className="muted">—</span>;

export const SourceCote = ({ cote }) => (
  <Badge square tone="outline" title={FIABILITE_SOURCE[cote]}>{cote}</Badge>
);

/** Cotation OTAN combinée, ex. « B2 » = source habituellement fiable, information probable */
export const Cotation = ({ source, contenu }) => (
  <Badge square tone="primary" title={`${FIABILITE_SOURCE[source] ?? 'Source non cotée'} · ${FIABILITE_CONTENU[contenu]}`}>
    {source ?? '?'}{contenu}
  </Badge>
);

export function EntiteType({ type }) {
  return (
    <span className="badge" style={{ background: `${ENTITE_COLORS[type]}1a`, color: ENTITE_COLORS[type] }}>
      {TYPES_ENTITE[type] ?? type}
    </span>
  );
}

/* ---------- Structure ---------- */

export function PageHeader({ title, subtitle, actions, breadcrumb }) {
  return (
    <header className="page-header">
      <div>
        {breadcrumb && (
          <nav className="breadcrumb" aria-label="Fil d'Ariane">
            {breadcrumb.map((b, i) => (
              <span key={b.label}>
                {b.to ? <Link to={b.to}>{b.label}</Link> : <span aria-current="page">{b.label}</span>}
                {i < breadcrumb.length - 1 && <span aria-hidden="true"> / </span>}
              </span>
            ))}
          </nav>
        )}
        <h1>{title}</h1>
        {subtitle && <p className="page-header__sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions no-print">{actions}</div>}
    </header>
  );
}

export function Card({ title, subtitle, actions, children, flush, footer, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card__header">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="row no-print">{actions}</div>}
        </div>
      )}
      <div className={flush ? 'card__body--flush' : 'card__body'}>{children}</div>
      {footer && <div className="card__footer">{footer}</div>}
    </section>
  );
}

export const Loading = ({ label = 'Chargement…' }) => (
  <div className="loading" role="status">
    <span className="spinner" aria-hidden="true" />
    <span>{label}</span>
  </div>
);

export function EmptyState({ icon: Icon = Inbox, title = 'Aucun résultat', children }) {
  return (
    <div className="empty">
      <span className="empty__icon" aria-hidden="true"><Icon size={22} /></span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}

export function ErrorAlert({ error }) {
  if (!error) return null;
  return (
    <div className="alert alert--danger" role="alert">
      <CircleAlert size={18} aria-hidden="true" />
      <div>
        <strong>{error.message || String(error)}</strong>
        {error.details?.champs && <div>Champs concernés : {error.details.champs.join(', ')}</div>}
      </div>
    </div>
  );
}

export function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);
  return (
    <nav className="pagination" aria-label="Pagination">
      <span>{from}–{to} sur {total}</span>
      <div className="row">
        <button type="button" className="btn btn--sm" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Page précédente">
          <ChevronLeft size={16} /> Précédent
        </button>
        <span aria-current="page">Page {page} / {pages}</span>
        <button type="button" className="btn btn--sm" onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Page suivante">
          Suivant <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}

/* ---------- Modale accessible ---------- */

export function Modal({ title, onClose, children, footer, size }) {
  const ref = useRef(null);
  const previous = useRef(document.activeElement);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Effet exécuté une seule fois : focus initial, piège du focus, Échap
  useEffect(() => {
    const el = ref.current;
    const focusables = () => el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = [...focusables()].find((n) => n.tagName !== 'BUTTON' || !n.classList.contains('modal__close'));
    (first || el).focus();
    const prevFocus = previous.current;
    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') {
        const list = [...focusables()].filter((n) => !n.disabled);
        if (!list.length) return;
        const [a, b] = [list[0], list[list.length - 1]];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
        else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prevFocus?.focus?.();
    };
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`modal ${size === 'sm' ? 'modal--sm' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1}>
        <div className="modal__header">
          <h2 id="modal-title">{title}</h2>
          <button type="button" className="btn btn--ghost btn--icon modal__close" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title = 'Confirmer la suppression', message, confirmLabel = 'Supprimer', onConfirm, onCancel, busy }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <button type="button" className="btn" onClick={onCancel}>Annuler</button>
          <button type="button" className="btn btn--danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Suppression…' : confirmLabel}
          </button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}

/* ---------- Champs ---------- */

export function Field({ label, htmlFor, required, hint, error, children, className = '' }) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="field__label" htmlFor={htmlFor}>
          {label}
          {required && <span className="req" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <span className="field__hint" id={`${htmlFor}-hint`}>{hint}</span>}
      {error && <span className="field__error" role="alert">{error}</span>}
    </div>
  );
}

export function Select({ id, value, onChange, options, placeholder = 'Tous', className = 'select', ...rest }) {
  return (
    <select id={id} className={className} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest}>
      {placeholder !== false && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
