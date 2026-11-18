import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Filter, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api, download } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { invalidateOptions, useDebounce, useFetch, useTitle } from '../lib/hooks.js';
import { useToast } from './Toast.jsx';
import { DataTable } from './DataTable.jsx';
import { ResourceForm, buildInitial, resetReferentiels } from './ResourceForm.jsx';
import { ConfirmDialog, EmptyState, ErrorAlert, Field, Loading, Modal, PageHeader, Pagination, Select } from './ui.jsx';

/**
 * Page de gestion générique d'une table : recherche, filtres, tri, pagination,
 * création / modification en fenêtre modale, suppression avec confirmation, export CSV.
 */
export function ResourcePage({
  title,
  subtitle,
  singular,          // libellé au singulier (« une source »)
  endpoint,          // ex. "/sources"
  resource,          // clé de permission
  columns,
  fields,
  filters = [],
  exportKey,
  defaultSort,
  rowLink,           // (row) => chemin de la page détail
  searchPlaceholder = 'Rechercher…',
  extraActions,
  canEditRow = () => true,
  refreshKey = 0,    // incrémenter pour forcer le rechargement depuis le parent
  rowActions,        // (row) => éléments supplémentaires dans la colonne d'actions
}) {
  useTitle(title);
  const { can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(defaultSort);
  const [filterValues, setFilterValues] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [editing, setEditing] = useState(null); // null | 'new' | item
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);

  const debouncedQ = useDebounce(q);
  const params = { q: debouncedQ, page, pageSize: 20, sort: sort?.key, order: sort?.order, ...filterValues };
  const { data, error, loading, reload } = useFetch(endpoint, params, { refreshKey });

  const setFilter = (name, v) => { setFilterValues((f) => ({ ...f, [name]: v })); setPage(1); };
  const activeFilters = Object.values(filterValues).filter(Boolean).length;

  const save = async (body) => {
    setBusy(true);
    setFormError(null);
    try {
      if (editing === 'new') await api.post(endpoint, body);
      else await api.put(`${endpoint}/${editing.id}`, body);
      toast.success(editing === 'new' ? `${singular} créé(e) avec succès` : 'Modifications enregistrées');
      invalidateOptions(endpoint);
      resetReferentiels();
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.del(`${endpoint}/${deleting.id}`);
      toast.success('Élément supprimé');
      invalidateOptions(endpoint);
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    try {
      await download(`/export/${exportKey}${toQuery({ q: debouncedQ, ...filterValues })}`);
    } catch (err) {
      toast.error(err);
    }
  };

  const canUpdate = can(resource, 'update');
  const canDelete = can(resource, 'delete');
  const items = data?.items ?? [];

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            {extraActions}
            {exportKey && can('export') && (
              <button type="button" className="btn" onClick={exportCsv}><Download size={16} aria-hidden="true" /> Exporter CSV</button>
            )}
            {can(resource, 'create') && fields && (
              <button type="button" className="btn btn--primary" onClick={() => { setFormError(null); setEditing('new'); }}>
                <Plus size={16} aria-hidden="true" /> Ajouter
              </button>
            )}
          </>
        }
      />

      <section className="card">
        <div className="toolbar">
          <div className="input-icon">
            <Search size={16} aria-hidden="true" />
            <input type="search" className="input" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
          </div>
          {filters.length > 0 && (
            <button type="button" className="btn" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters} aria-controls="filters-panel">
              <Filter size={16} aria-hidden="true" /> Filtres{activeFilters ? ` (${activeFilters})` : ''}
            </button>
          )}
          {activeFilters > 0 && (
            <button type="button" className="btn btn--ghost" onClick={() => { setFilterValues({}); setPage(1); }}>Réinitialiser</button>
          )}
          <span className="toolbar__spacer" />
          {data && <span className="muted">{data.total} résultat{data.total > 1 ? 's' : ''}</span>}
        </div>

        {showFilters && (
          <div id="filters-panel" className="filter-panel">
            <div className="filters">
              {filters.map((f) => (
                <Field key={f.name} label={f.label} htmlFor={`f-${f.name}`}>
                  {f.type === 'date' ? (
                    <input type="date" id={`f-${f.name}`} className="input" value={filterValues[f.name] ?? ''} onChange={(e) => setFilter(f.name, e.target.value)} />
                  ) : (
                    <Select id={`f-${f.name}`} value={filterValues[f.name]} onChange={(v) => setFilter(f.name, v)} options={f.options} />
                  )}
                </Field>
              ))}
            </div>
          </div>
        )}

        {error && <div className="card__body"><ErrorAlert error={error} /></div>}
        {loading && !data ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState title="Aucun élément">
            {q || activeFilters ? 'Aucun résultat ne correspond à vos critères.' : 'Commencez par ajouter un premier élément.'}
          </EmptyState>
        ) : (
          <>
            <DataTable
              caption={title}
              columns={columns}
              rows={items}
              sort={sort}
              onSort={(s) => { setSort(s); setPage(1); }}
              onRowClick={rowLink ? (row) => navigate(rowLink(row)) : canUpdate && fields ? (row) => { setFormError(null); setEditing(row); } : undefined}
              actions={(canUpdate && fields) || canDelete || rowActions ? (row) => (
                <div className="btn-group">
                  {rowActions?.(row)}
                  {canUpdate && fields && canEditRow(row) && (
                    <button type="button" className="btn btn--ghost btn--sm btn--icon" onClick={() => { setFormError(null); setEditing(row); }} aria-label="Modifier" title="Modifier">
                      <Pencil size={15} />
                    </button>
                  )}
                  {canDelete && canEditRow(row) && (
                    <button type="button" className="btn btn--ghost btn--sm btn--icon" onClick={() => setDeleting(row)} aria-label="Supprimer" title="Supprimer" style={{ color: 'var(--danger)' }}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ) : undefined}
            />
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
          </>
        )}
      </section>

      {editing && (
        <Modal
          title={editing === 'new' ? `Ajouter ${singular}` : `Modifier ${singular}`}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setEditing(null)}>Annuler</button>
              <button type="submit" form="resource-form" className="btn btn--primary" disabled={busy}>
                {busy ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </>
          }
        >
          <ResourceForm
            formId="resource-form"
            fields={typeof fields === 'function' ? fields(editing === 'new' ? null : editing) : fields}
            initial={buildInitial(typeof fields === 'function' ? fields(editing === 'new' ? null : editing) : fields, editing === 'new' ? null : editing)}
            onSubmit={save}
            error={formError}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          message={`Cette action est définitive. Confirmez-vous la suppression de cet élément ?`}
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
          busy={busy}
        />
      )}
    </>
  );
}

function toQuery(params) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
}
