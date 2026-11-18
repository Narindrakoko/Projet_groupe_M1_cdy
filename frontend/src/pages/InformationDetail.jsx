import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Archive, CheckCircle2, Download, FileUp, Pencil, Printer, Trash2 } from 'lucide-react';
import { api, download } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useFetch, useTitle } from '../lib/hooks.js';
import { CLASSIFICATIONS, FIABILITE_CONTENU, FIABILITE_SOURCE, TYPES_INFO, TYPES_SOURCE } from '../lib/labels.js';
import { fmtDate, fmtDateTime, fmtSize, fullName } from '../lib/format.js';
import { ResourceForm, buildInitial } from '../components/ResourceForm.jsx';
import { DocumentUpload } from '../components/DocumentUpload.jsx';
import { useToast } from '../components/Toast.jsx';
import {
  Badge, Card, ClassifBadge, ConfirmDialog, Cotation, EmptyState, EntiteType, ErrorAlert, ImpactBadge, Loading, Modal, PageHeader, StatutBadge,
} from '../components/ui.jsx';
import { informationFields } from './informationForm.js';

export default function InformationDetail() {
  const { id } = useParams();
  const { user, can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: info, error, loading, reload } = useFetch(`/informations/${id}`);
  useTitle(info?.titre ?? 'Information');

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);

  if (loading && !info) return <Loading />;
  if (error) return <ErrorAlert error={error.status === 404 ? { message: "Information introuvable ou hors de votre niveau d'habilitation." } : error} />;

  const fields = informationFields(user, can);
  const source = info.collecte?.source;

  const save = async (body) => {
    setBusy(true);
    setFormError(null);
    try {
      await api.put(`/informations/${id}`, body);
      toast.success('Information mise à jour');
      setEditing(false);
      reload();
    } catch (err) {
      setFormError(err);
    } finally {
      setBusy(false);
    }
  };

  const setStatut = async (statut) => {
    try {
      await api.patch(`/informations/${id}/statut`, { statut });
      toast.success(statut === 'VALIDE' ? 'Information validée' : statut === 'ARCHIVE' ? 'Information archivée' : 'Statut mis à jour');
      reload();
    } catch (err) {
      toast.error(err);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.del(`/informations/${id}`);
      toast.success('Information supprimée');
      navigate('/recherche');
    } catch (err) {
      toast.error(err);
      setBusy(false);
    }
  };

  const removeDoc = async () => {
    try {
      await api.del(`/documents/${deletingDoc.id}`);
      toast.success('Document supprimé');
      setDeletingDoc(null);
      reload();
    } catch (err) {
      toast.error(err);
    }
  };

  return (
    <>
      <div className={`classif-banner classif--${info.niveauClassification}`}>{CLASSIFICATIONS[info.niveauClassification]}</div>
      <PageHeader
        breadcrumb={[{ label: 'Recherche', to: '/recherche' }, { label: `Information n° ${info.id}` }]}
        title={info.titre}
        subtitle={
          <span className="row" style={{ marginTop: 6 }}>
            <StatutBadge statut={info.statut} />
            <Cotation source={source?.fiabiliteSource} contenu={info.fiabiliteContenu} />
            <Badge tone="outline">{TYPES_INFO[info.typeInfo]}</Badge>
            <span className="muted">Enregistrée le {fmtDateTime(info.dateEnregistrement)}</span>
          </span>
        }
        actions={
          <>
            {can('informations', 'validate') && info.statut !== 'VALIDE' && (
              <button type="button" className="btn" onClick={() => setStatut('VALIDE')}><CheckCircle2 size={16} aria-hidden="true" /> Valider</button>
            )}
            {can('informations', 'validate') && info.statut !== 'ARCHIVE' && (
              <button type="button" className="btn" onClick={() => setStatut('ARCHIVE')}><Archive size={16} aria-hidden="true" /> Archiver</button>
            )}
            <button type="button" className="btn" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> Imprimer / PDF</button>
            {can('informations', 'update') && (
              <button type="button" className="btn btn--primary" onClick={() => { setFormError(null); setEditing(true); }}><Pencil size={16} aria-hidden="true" /> Modifier</button>
            )}
            {can('informations', 'delete') && (
              <button type="button" className="btn btn--ghost btn--icon" onClick={() => setDeleting(true)} aria-label="Supprimer l'information" title="Supprimer" style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
            )}
          </>
        }
      />

      <div className="grid grid--main-side">
        <div className="stack">
          <Card title="Contenu">
            {info.contenuTexte ? <p className="prose">{info.contenuTexte}</p> : <p className="muted">Aucun contenu textuel.</p>}
            {info.tags?.length > 0 && (
              <div className="row" style={{ marginTop: 16 }}>
                {info.tags.map((t) => <Link key={t.id} to={`/recherche?tagId=${t.id}`} className="badge badge--primary">{t.nomTag}</Link>)}
              </div>
            )}
          </Card>

          <Card
            title={`Documents (${info.documents.length})`}
            flush
            actions={can('documents', 'create') && <button type="button" className="btn btn--sm" onClick={() => setUploading(true)}><FileUp size={15} aria-hidden="true" /> Ajouter</button>}
          >
            {info.documents.length ? (
              <ul className="list">
                {info.documents.map((d) => (
                  <li key={d.id}>
                    <div className="list__main">
                      <div className="list__title">{d.nomOriginal}</div>
                      <div className="list__meta">
                        {fmtSize(d.taille)} · {d.typeFichier} · ajouté le {fmtDate(d.dateAjout)}
                        {d.description && ` · ${d.description}`}
                      </div>
                      <div className="list__meta mono" title="Empreinte SHA-256">SHA-256 : {d.hash}</div>
                    </div>
                    <button type="button" className="btn btn--sm no-print" onClick={() => download(`/documents/${d.id}/fichier`, d.nomOriginal).catch(toast.error)}>
                      <Download size={15} aria-hidden="true" /> Télécharger
                    </button>
                    {can('documents', 'delete') && (
                      <button type="button" className="btn btn--ghost btn--sm btn--icon no-print" onClick={() => setDeletingDoc(d)} aria-label={`Supprimer ${d.nomOriginal}`} style={{ color: 'var(--danger)' }}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="Aucun document joint" />}
          </Card>

          <Card title={`Événements liés (${info.evenements.length})`} flush>
            {info.evenements.length ? (
              <ul className="list">
                {info.evenements.map((e) => (
                  <li key={e.id}>
                    <div className="list__main">
                      <div className="list__title">{e.titre}</div>
                      <div className="list__meta">{fmtDateTime(e.dateDebut)}{e.localisation && ` · ${e.localisation.nomLieu}`}</div>
                    </div>
                    <ImpactBadge impact={e.impact} />
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="Aucun événement lié" />}
          </Card>
        </div>

        <div className="stack">
          <Card title="Origine et évaluation">
            <dl className="dl">
              <dt>Source</dt>
              <dd>{source ? <>{source.nomSource}<div className="muted">{TYPES_SOURCE[source.typeSource]}</div></> : '—'}</dd>
              <dt>Fiabilité source</dt>
              <dd>{source ? FIABILITE_SOURCE[source.fiabiliteSource] : '—'}</dd>
              <dt>Crédibilité</dt>
              <dd>{FIABILITE_CONTENU[info.fiabiliteContenu]}</dd>
              <dt>Collecte</dt>
              <dd>{info.collecte ? <>{info.collecte.methode} — {fmtDate(info.collecte.dateCollecte)}{info.collecte.collectePar && <div className="muted">par {fullName(info.collecte.collectePar)}</div>}</> : '—'}</dd>
              <dt>Date des faits</dt>
              <dd>{fmtDateTime(info.dateEvenement)}</dd>
              <dt>Classification</dt>
              <dd><ClassifBadge niveau={info.niveauClassification} /></dd>
            </dl>
          </Card>

          <Card title={`Entités concernées (${info.entites.length})`} flush>
            {info.entites.length ? (
              <ul className="list">
                {info.entites.map((e) => (
                  <li key={e.id}>
                    <div className="list__main">
                      <Link to={`/entites/${e.id}`} className="list__title">{e.nom}</Link>
                      {e.role && <div className="list__meta">Rôle : {e.role}</div>}
                    </div>
                    <EntiteType type={e.typeEntite} />
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="Aucune entité liée" />}
          </Card>
        </div>
      </div>

      {editing && (
        <Modal
          title="Modifier l'information"
          onClose={() => setEditing(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setEditing(false)}>Annuler</button>
              <button type="submit" form="info-edit" className="btn btn--primary" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
            </>
          }
        >
          <ResourceForm formId="info-edit" fields={fields} initial={buildInitial(fields, info)} onSubmit={save} error={formError} />
        </Modal>
      )}
      {uploading && <DocumentUpload infoId={info.id} onClose={() => setUploading(false)} onUploaded={() => { setUploading(false); reload(); }} />}
      {deleting && <ConfirmDialog message="L'information, ses documents et ses rattachements seront définitivement supprimés." onConfirm={remove} onCancel={() => setDeleting(false)} busy={busy} />}
      {deletingDoc && <ConfirmDialog message={`Supprimer définitivement « ${deletingDoc.nomOriginal} » ?`} onConfirm={removeDoc} onCancel={() => setDeletingDoc(null)} />}
    </>
  );
}
