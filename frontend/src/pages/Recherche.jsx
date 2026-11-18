import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Download, Plus, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { api, download, qs } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useDebounce, useFetch, useOptions, useTitle } from '../lib/hooks.js';
import {
  CLASSIFICATIONS, FIABILITE_CONTENU, FIABILITE_SOURCE, STATUTS_INFO, TYPES_ENTITE, TYPES_INFO, TYPES_SOURCE_COURT, toOptions,
} from '../lib/labels.js';
import { fmtDate, fmtDateTime } from '../lib/format.js';
import { DataTable } from '../components/DataTable.jsx';
import { ResourceForm, buildInitial } from '../components/ResourceForm.jsx';
import { useToast } from '../components/Toast.jsx';
import { Badge, ClassifBadge, Cotation, EmptyState, ErrorAlert, Field, Loading, Modal, PageHeader, Pagination, Select, StatutBadge } from '../components/ui.jsx';
import { informationFields } from './informationForm.js';

const FILTER_KEYS = ['q', 'typeInfo', 'statut', 'classification', 'fiabiliteMax', 'typeSource', 'fiabiliteSource', 'sourceId', 'collecteId', 'tagId', 'entiteId', 'dateFrom', 'dateTo'];

export default function Recherche() {
  useTitle('Recherche multicritères');
  const { user, can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const filters = useMemo(() => Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || ''])), [params]);
  const page = Number(params.get('page')) || 1;
  const sort = { key: params.get('sort') || 'dateEnregistrement', order: params.get('order') || 'desc' };

  const [q, setQ] = useState(filters.q);
  const dq = useDebounce(q, 350);
  const [creating, setCreating] = useState(params.get('nouveau') === '1');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [showFilters, setShowFilters] = useState(true);

  const update = (patch, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === '' || v === null || v === undefined) next.delete(k);
      else next.set(k, v);
    }
    if (resetPage) next.delete('page');
    next.delete('nouveau');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if (dq !== filters.q) update({ q: dq });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  const query = { ...filters, page, pageSize: 20, sort: sort.key, order: sort.order };
  const { data, error, loading, reload } = useFetch('/informations', query);

  const sources = useOptions('/sources', { labelOf: (s) => s.nomSource });
  const tags = useOptions('/tags', { labelOf: (t) => t.nomTag });
  const entites = useOptions('/entites', { labelOf: (e) => `${e.nom} (${TYPES_ENTITE[e.typeEntite]})` });

  const active = FILTER_KEYS.filter((k) => k !== 'q' && filters[k]).length;
  const fields = informationFields(user, can);

  const create = async (body) => {
    setBusy(true);
    setFormError(null);
    try {
      const created = await api.post('/informations', body);
      toast.success('Information enregistrée');
      setCreating(false);
      navigate(`/informations/${created.id}`);
    } catch (err) {
      setFormError(err);
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => download(`/export/informations${qs(filters)}`).catch(toast.error);

  const sel = (name, label, options) => (
    <Field label={label} htmlFor={`f-${name}`}>
      <Select id={`f-${name}`} value={filters[name]} onChange={(v) => update({ [name]: v })} options={options} />
    </Field>
  );

  const columns = [
    { key: 'titre', label: 'Information', sortable: true, render: (r) => (
      <div style={{ minWidth: 240 }}>
        <Link to={`/informations/${r.id}`} className="cell-title">{r.titre}</Link>
        <div className="row" style={{ marginTop: 4, gap: 4 }}>
          <span className="cell-sub">{TYPES_INFO[r.typeInfo]}</span>
          {r.tags?.slice(0, 3).map((t) => <Badge key={t.id} tone="outline">{t.nomTag}</Badge>)}
        </div>
      </div>
    ) },
    { key: 'fiabiliteContenu', label: 'Cotation', sortable: true, render: (r) => <Cotation source={r.collecte?.source?.fiabiliteSource} contenu={r.fiabiliteContenu} /> },
    { key: 'source', label: 'Source', render: (r) => (r.collecte?.source ? (
      <div><div>{r.collecte.source.nomSource}</div><div className="cell-sub">{TYPES_SOURCE_COURT[r.collecte.source.typeSource]}</div></div>
    ) : <span className="muted">—</span>) },
    { key: 'niveauClassification', label: 'Classification', sortable: true, render: (r) => <ClassifBadge niveau={r.niveauClassification} /> },
    { key: 'statut', label: 'Statut', sortable: true, render: (r) => <StatutBadge statut={r.statut} /> },
    { key: 'dateEvenement', label: 'Date des faits', sortable: true, render: (r) => fmtDate(r.dateEvenement) },
    { key: 'dateEnregistrement', label: 'Enregistrée le', sortable: true, render: (r) => fmtDateTime(r.dateEnregistrement) },
  ];

  return (
    <>
      <PageHeader
        title="Recherche multicritères"
        subtitle="Interrogez l'ensemble des informations accessibles selon votre habilitation."
        actions={
          <>
            {can('export') && <button type="button" className="btn" onClick={exportCsv}><Download size={16} aria-hidden="true" /> Exporter CSV</button>}
            {can('informations', 'create') && (
              <button type="button" className="btn btn--primary" onClick={() => { setFormError(null); setCreating(true); }}>
                <Plus size={16} aria-hidden="true" /> Nouvelle information
              </button>
            )}
          </>
        }
      />

      <section className="card">
        <div className="toolbar">
          <div className="input-icon" style={{ maxWidth: 560 }}>
            <Search size={16} aria-hidden="true" />
            <input type="search" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mots-clés dans le titre ou le contenu…" aria-label="Mots-clés" />
          </div>
          <button type="button" className="btn" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters} aria-controls="search-filters">
            <SlidersHorizontal size={16} aria-hidden="true" /> Critères{active ? ` (${active})` : ''}
          </button>
          {(active > 0 || filters.q) && (
            <button type="button" className="btn btn--ghost" onClick={() => { setQ(''); setParams({}, { replace: true }); }}>
              <RotateCcw size={16} aria-hidden="true" /> Réinitialiser
            </button>
          )}
          <span className="toolbar__spacer" />
          {data && <span className="muted" aria-live="polite">{data.total} information{data.total > 1 ? 's' : ''}</span>}
        </div>

        {showFilters && (
          <div className="filter-panel" id="search-filters">
            <div className="filters">
              {sel('typeInfo', "Type d'information", toOptions(TYPES_INFO))}
              {sel('statut', 'Statut', toOptions(STATUTS_INFO))}
              {sel('classification', 'Classification', toOptions(CLASSIFICATIONS).filter((o) => Number(o.value) <= user.niveauHabilitation))}
              {sel('fiabiliteMax', 'Crédibilité minimale', toOptions(FIABILITE_CONTENU).map((o) => ({ ...o, label: `${o.label} ou mieux` })))}
              {sel('typeSource', 'Type de source', toOptions(TYPES_SOURCE_COURT))}
              {sel('fiabiliteSource', 'Cotation de la source', toOptions(FIABILITE_SOURCE))}
              {sel('sourceId', 'Source', sources.options)}
              {sel('tagId', 'Tag', tags.options)}
              {sel('entiteId', 'Entité concernée', entites.options)}
              <Field label="Faits à partir du" htmlFor="f-dateFrom">
                <input type="date" id="f-dateFrom" className="input" value={filters.dateFrom} onChange={(e) => update({ dateFrom: e.target.value })} />
              </Field>
              <Field label="Faits jusqu'au" htmlFor="f-dateTo">
                <input type="date" id="f-dateTo" className="input" value={filters.dateTo} onChange={(e) => update({ dateTo: e.target.value })} />
              </Field>
            </div>
            {filters.collecteId && (
              <p className="field__hint" style={{ marginTop: 10 }}>
                Filtré sur la collecte n° {filters.collecteId} — <button type="button" className="btn btn--ghost btn--sm" onClick={() => update({ collecteId: '' })}>retirer</button>
              </p>
            )}
          </div>
        )}

        {error && <div className="card__body"><ErrorAlert error={error} /></div>}
        {loading && !data ? (
          <Loading />
        ) : !data?.items.length ? (
          <EmptyState icon={Search} title="Aucune information trouvée">Modifiez ou élargissez vos critères de recherche.</EmptyState>
        ) : (
          <>
            <DataTable
              caption="Résultats de la recherche"
              columns={columns}
              rows={data.items}
              sort={sort}
              onSort={(s) => update({ sort: s.key, order: s.order })}
              onRowClick={(r) => navigate(`/informations/${r.id}`)}
            />
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(p) => update({ page: p }, false)} />
          </>
        )}
      </section>

      {creating && (
        <Modal
          title="Nouvelle information"
          onClose={() => { setCreating(false); reload(); }}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setCreating(false)}>Annuler</button>
              <button type="submit" form="info-form" className="btn btn--primary" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
            </>
          }
        >
          {!can('informations', 'validate') && (
            <div className="alert alert--info" style={{ marginBottom: 16 }}>L'information sera enregistrée au statut « Brut » en attendant sa validation par un responsable.</div>
          )}
          <ResourceForm formId="info-form" fields={fields} initial={buildInitial(fields, null)} onSubmit={create} error={formError} />
        </Modal>
      )}
    </>
  );
}
