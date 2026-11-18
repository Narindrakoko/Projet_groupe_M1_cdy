import { useState } from 'react';
import { Download, Search } from 'lucide-react';
import { download, qs } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useDebounce, useFetch, useOptions, useTitle } from '../lib/hooks.js';
import { ACTIONS_AUDIT, ACTION_TONE, ROLES, toOptions } from '../lib/labels.js';
import { fmtDateTime, fullName } from '../lib/format.js';
import { DataTable } from '../components/DataTable.jsx';
import { useToast } from '../components/Toast.jsx';
import { Badge, EmptyState, ErrorAlert, Field, Loading, PageHeader, Pagination, Select } from '../components/ui.jsx';

const TABLES = ['information', 'entite', 'source', 'collecte', 'evenement', 'lien_entre_entites', 'localisation', 'document', 'tag', 'utilisateur'];

export default function Historique() {
  useTitle("Journal d'audit");
  const { can } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [f, setF] = useState({ action: '', userId: '', tableConcernee: '', dateFrom: '', dateTo: '' });
  const [page, setPage] = useState(1);
  const dq = useDebounce(q);
  const params = { q: dq, ...f, page, pageSize: 25 };
  const { data, error, loading } = useFetch('/historique', params);
  const users = useOptions('/utilisateurs', { labelOf: (u) => `${fullName(u)} (${ROLES[u.role]})`, enabled: can('utilisateurs') });
  const set = (k) => (v) => { setF((s) => ({ ...s, [k]: v })); setPage(1); };

  return (
    <>
      <PageHeader
        title="Journal d'audit"
        subtitle="Traçabilité des connexions, consultations, modifications et exports."
        actions={<button type="button" className="btn" onClick={() => download(`/export/historique${qs({ q: dq, ...f })}`).catch(toast.error)}><Download size={16} aria-hidden="true" /> Exporter CSV</button>}
      />
      <section className="card">
        <div className="toolbar">
          <div className="input-icon">
            <Search size={16} aria-hidden="true" />
            <input type="search" className="input" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Rechercher dans les détails, un utilisateur…" aria-label="Rechercher dans le journal" />
          </div>
          <span className="toolbar__spacer" />
          {data && <span className="muted">{data.total} entrée(s)</span>}
        </div>
        <div className="filter-panel">
          <div className="filters">
            <Field label="Action" htmlFor="a-action"><Select id="a-action" value={f.action} onChange={set('action')} options={toOptions(ACTIONS_AUDIT)} /></Field>
            {can('utilisateurs') && <Field label="Utilisateur" htmlFor="a-user"><Select id="a-user" value={f.userId} onChange={set('userId')} options={users.options} /></Field>}
            <Field label="Table" htmlFor="a-table"><Select id="a-table" value={f.tableConcernee} onChange={set('tableConcernee')} options={TABLES.map((t) => ({ value: t, label: t }))} /></Field>
            <Field label="Du" htmlFor="a-from"><input id="a-from" type="date" className="input" value={f.dateFrom} onChange={(e) => set('dateFrom')(e.target.value)} /></Field>
            <Field label="Au" htmlFor="a-to"><input id="a-to" type="date" className="input" value={f.dateTo} onChange={(e) => set('dateTo')(e.target.value)} /></Field>
          </div>
        </div>
        {error && <div className="card__body"><ErrorAlert error={error} /></div>}
        {loading && !data ? <Loading /> : !data?.items.length ? <EmptyState title="Aucune entrée" /> : (
          <>
            <DataTable
              caption="Journal d'audit"
              rows={data.items}
              columns={[
                { key: 'dateAction', label: 'Date', render: (r) => <span className="num">{fmtDateTime(r.dateAction)}</span> },
                { key: 'utilisateur', label: 'Utilisateur', render: (r) => (r.utilisateur ? (
                  <div><div className="cell-title">{fullName(r.utilisateur)}</div><div className="cell-sub">{ROLES[r.utilisateur.role]}</div></div>
                ) : <span className="muted">Anonyme</span>) },
                { key: 'action', label: 'Action', render: (r) => <Badge tone={ACTION_TONE[r.action]}>{ACTIONS_AUDIT[r.action] ?? r.action}</Badge> },
                { key: 'table', label: 'Objet', render: (r) => (r.tableConcernee ? <span className="mono">{r.tableConcernee}{r.idEnregistrement ? ` #${r.idEnregistrement}` : ''}</span> : '—') },
                { key: 'details', label: 'Détails', render: (r) => <span className="truncate" style={{ display: 'inline-block' }} title={r.details}>{r.details || '—'}</span> },
                { key: 'ip', label: 'Adresse IP', render: (r) => <span className="mono">{r.adresseIp || '—'}</span> },
              ]}
            />
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
          </>
        )}
      </section>
    </>
  );
}
