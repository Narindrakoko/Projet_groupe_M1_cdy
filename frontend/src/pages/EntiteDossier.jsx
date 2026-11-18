import { Fragment, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { ArrowLeft, ArrowRight, Network, Pencil, Printer, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useFetch, useTitle } from '../lib/hooks.js';
import { ENTITE_COLORS, FIABILITE_CONTENU, TYPES_ENTITE } from '../lib/labels.js';
import { fmtDate, fmtDateTime, fmtLongDate, fullName } from '../lib/format.js';
import { markerIcon } from '../lib/map.js';
import { ResourceForm, buildInitial } from '../components/ResourceForm.jsx';
import { useToast } from '../components/Toast.jsx';
import {
  Badge, Card, ClassifBadge, ConfirmDialog, Cotation, EmptyState, EntiteType, ErrorAlert, ImpactBadge, Loading, Modal, PageHeader, StatutBadge,
} from '../components/ui.jsx';
import { entiteFields } from './resources.jsx';

const TABS = [
  ['liens', 'Liens'],
  ['informations', 'Informations'],
  ['evenements', 'Événements'],
];

export default function EntiteDossier() {
  const { id } = useParams();
  const { user, can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useFetch(`/entites/${id}/dossier`);
  useTitle(data ? `Dossier — ${data.entite.nom}` : 'Dossier entité');
  const [tab, setTab] = useState('liens');
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorAlert error={error} />;
  const { entite: e, informations, liens, evenements } = data;
  const color = ENTITE_COLORS[e.typeEntite];
  const attrs = e.autresAttributs && typeof e.autresAttributs === 'object' ? Object.entries(e.autresAttributs) : [];
  const loc = e.localisation;

  const save = async (body) => {
    setBusy(true);
    setFormError(null);
    try {
      await api.put(`/entites/${id}`, body);
      toast.success('Fiche mise à jour');
      setEditing(false);
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
      await api.del(`/entites/${id}`);
      toast.success('Entité supprimée');
      navigate('/entites');
    } catch (err) {
      toast.error(err);
      setBusy(false);
    }
  };

  const counts = { liens: liens.length, informations: informations.length, evenements: evenements.length };

  const LiensSection = (
    liens.length ? (
      <div className="table-wrap">
        <table className="table">
          <caption className="sr-only">Liens de l'entité</caption>
          <thead><tr><th scope="col">Sens</th><th scope="col">Relation</th><th scope="col">Entité liée</th><th scope="col">Période</th><th scope="col">Fiabilité</th></tr></thead>
          <tbody>
            {liens.map((l) => (
              <tr key={l.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{l.sens === 'sortant'
                  ? <span className="row" title="Lien sortant"><ArrowRight size={15} aria-hidden="true" /> Sortant</span>
                  : <span className="row" title="Lien entrant"><ArrowLeft size={15} aria-hidden="true" /> Entrant</span>}
                </td>
                <td><Badge tone="primary">{l.typeLien}</Badge></td>
                <td><span className="row"><Link to={`/entites/${l.autre.id}`} className="cell-title">{l.autre.nom}</Link><EntiteType type={l.autre.typeEntite} /></span></td>
                <td>{fmtDate(l.debutRelation)} → {l.finRelation ? fmtDate(l.finRelation) : 'en cours'}</td>
                <td>{FIABILITE_CONTENU[l.fiabilite]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : <EmptyState title="Aucun lien connu" />
  );

  const InfosSection = (
    informations.length ? (
      <ul className="list">
        {informations.map((i) => (
          <li key={i.id}>
            <div className="list__main">
              <Link to={`/informations/${i.id}`} className="list__title">{i.titre}</Link>
              <div className="list__meta">
                {fmtDate(i.dateEvenement || i.dateEnregistrement)}
                {i.collecte?.source && ` · ${i.collecte.source.nomSource}`}
                {i.role && ` · rôle : ${i.role}`}
              </div>
            </div>
            <Cotation source={i.collecte?.source?.fiabiliteSource} contenu={i.fiabiliteContenu} />
            <StatutBadge statut={i.statut} />
            <ClassifBadge niveau={i.niveauClassification} />
          </li>
        ))}
      </ul>
    ) : <EmptyState title="Aucune information accessible" />
  );

  const EventsSection = (
    evenements.length ? (
      <ul className="list">
        {evenements.map((ev) => (
          <li key={ev.id}>
            <div className="list__main">
              <div className="list__title">{ev.titre}</div>
              <div className="list__meta">{fmtDateTime(ev.dateDebut)}{ev.localisation && ` · ${ev.localisation.nomLieu}`}{ev.typeEvenement && ` · ${ev.typeEvenement}`}</div>
            </div>
            <ImpactBadge impact={ev.impact} />
          </li>
        ))}
      </ul>
    ) : <EmptyState title="Aucun événement" />
  );

  const sections = { liens: LiensSection, informations: InfosSection, evenements: EventsSection };

  return (
    <>
      <div className="print-only" style={{ marginBottom: 12 }}>
        <strong>Dossier d'entité — édité le {fmtLongDate(new Date())} par {fullName(user)}</strong>
      </div>
      <PageHeader
        breadcrumb={[{ label: 'Dossiers entités', to: '/entites' }, { label: e.nom }]}
        title={
          <span className="row" style={{ gap: 14 }}>
            <span className="avatar avatar--lg" style={{ background: `${color}1f`, color }} aria-hidden="true">{e.nom[0]}</span>
            <span>
              {e.nom}
              {e.alias && <span className="muted" style={{ display: 'block', fontSize: 14, fontWeight: 500 }}>alias {e.alias}</span>}
            </span>
          </span>
        }
        actions={
          <>
            {can('liens') && <Link to={`/reseau?entiteId=${e.id}`} className="btn"><Network size={16} aria-hidden="true" /> Voir le réseau</Link>}
            <button type="button" className="btn" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> Exporter en PDF</button>
            {can('entites', 'update') && <button type="button" className="btn btn--primary" onClick={() => { setFormError(null); setEditing(true); }}><Pencil size={16} aria-hidden="true" /> Modifier</button>}
            {can('entites', 'delete') && (
              <button type="button" className="btn btn--ghost btn--icon" onClick={() => setDeleting(true)} aria-label="Supprimer l'entité" style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
            )}
          </>
        }
      />

      <div className="grid grid--main-side">
        <div className="stack">
          <section className="card no-print">
            <div className="tabs" role="tablist" aria-label="Sections du dossier">
              {TABS.map(([key, label]) => (
                <button key={key} type="button" role="tab" id={`tab-${key}`} aria-selected={tab === key} aria-controls={`panel-${key}`} onClick={() => setTab(key)}>
                  {label} <span className="muted">({counts[key]})</span>
                </button>
              ))}
            </div>
            <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>{sections[tab]}</div>
          </section>

          {/* Version imprimable : toutes les sections à la suite */}
          <div className="print-only stack">
            {TABS.map(([key, label]) => <Card key={key} title={`${label} (${counts[key]})`} flush>{sections[key]}</Card>)}
          </div>
        </div>

        <div className="stack">
          <Card title="Fiche signalétique">
            <dl className="dl">
              <dt>Type</dt><dd><EntiteType type={e.typeEntite} /></dd>
              {e.typeEntite === 'PERSONNE' && <><dt>Naissance</dt><dd>{fmtDate(e.dateNaissance)}</dd></>}
              <dt>Nationalité</dt><dd>{e.nationalite || '—'}</dd>
              <dt>Localisation</dt><dd>{loc ? `${loc.nomLieu}${loc.pays ? `, ${loc.pays}` : ''}` : '—'}</dd>
              {attrs.map(([k, v]) => (
                <Fragment key={k}>
                  <dt style={{ textTransform: 'capitalize' }}>{k}</dt>
                  <dd>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd>
                </Fragment>
              ))}
              <dt>Créée le</dt><dd>{fmtDate(e.dateCreation)}</dd>
            </dl>
            {e.description && <p className="prose" style={{ marginTop: 16 }}>{e.description}</p>}
          </Card>

          {loc?.latitude != null && (
            <Card title="Localisation" flush className="no-print">
              <MapContainer center={[loc.latitude, loc.longitude]} zoom={9} style={{ height: 220, borderRadius: '0 0 12px 12px' }} scrollWheelZoom={false}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[loc.latitude, loc.longitude]} icon={markerIcon(color)} />
              </MapContainer>
            </Card>
          )}

          <Card title="Synthèse">
            <dl className="dl">
              <dt>Liens</dt><dd>{liens.length} ({liens.filter((l) => l.sens === 'sortant').length} sortants)</dd>
              <dt>Informations</dt><dd>{informations.length} accessibles</dd>
              <dt>Événements</dt><dd>{evenements.length}</dd>
              <dt>Type</dt><dd>{TYPES_ENTITE[e.typeEntite]}</dd>
            </dl>
          </Card>
        </div>
      </div>

      {editing && (
        <Modal
          title="Modifier la fiche"
          onClose={() => setEditing(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setEditing(false)}>Annuler</button>
              <button type="submit" form="entite-edit" className="btn btn--primary" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
            </>
          }
        >
          <ResourceForm formId="entite-edit" fields={entiteFields} initial={buildInitial(entiteFields, e)} onSubmit={save} error={formError} />
        </Modal>
      )}
      {deleting && <ConfirmDialog message={`Supprimer « ${e.nom} » ? Ses liens et rattachements seront également supprimés.`} onConfirm={remove} onCancel={() => setDeleting(false)} busy={busy} />}
    </>
  );
}
