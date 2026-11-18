import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileUp } from 'lucide-react';
import { download } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useOptions } from '../lib/hooks.js';
import { fmtDateTime, fmtSize } from '../lib/format.js';
import { ResourcePage } from '../components/ResourcePage.jsx';
import { DocumentUpload } from '../components/DocumentUpload.jsx';
import { useToast } from '../components/Toast.jsx';
import { ClassifBadge } from '../components/ui.jsx';

export default function Documents() {
  const { can } = useAuth();
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const infos = useOptions('/informations', { labelOf: (i) => `#${i.id} — ${i.titre}`, enabled: uploading });

  return (
    <>
      <ResourcePage
        title="Documents"
        subtitle="Pièces jointes aux informations. Chaque fichier est scellé par son empreinte SHA-256."
        singular="un document"
        endpoint="/documents"
        resource="documents"
        refreshKey={refresh}
        defaultSort={{ key: 'dateAjout', order: 'desc' }}
        searchPlaceholder="Rechercher (nom, type, empreinte)…"
        extraActions={can('documents', 'create') && (
          <button type="button" className="btn btn--primary" onClick={() => setUploading(true)}><FileUp size={16} aria-hidden="true" /> Ajouter un document</button>
        )}
        columns={[
          { key: 'nomOriginal', label: 'Fichier', sortable: true, render: (r) => (
            <div><div className="cell-title">{r.nomOriginal}</div><div className="cell-sub mono truncate" title={r.hash}>{r.hash.slice(0, 24)}…</div></div>
          ) },
          { key: 'information', label: 'Information', render: (r) => (
            <span className="row"><Link to={`/informations/${r.information.id}`}>{r.information.titre}</Link><ClassifBadge niveau={r.information.niveauClassification} /></span>
          ) },
          { key: 'typeFichier', label: 'Type', sortable: true, render: (r) => <span className="mono">{r.typeFichier}</span> },
          { key: 'taille', label: 'Taille', sortable: true, className: 'num', render: (r) => fmtSize(r.taille) },
          { key: 'dateAjout', label: 'Ajouté le', sortable: true, render: (r) => fmtDateTime(r.dateAjout) },
        ]}
        fields={[{ name: 'description', label: 'Description', type: 'textarea' }]}
        rowActions={(r) => (
          <button type="button" className="btn btn--ghost btn--sm btn--icon" onClick={() => download(`/documents/${r.id}/fichier`, r.nomOriginal).catch(toast.error)} aria-label={`Télécharger ${r.nomOriginal}`} title="Télécharger">
            <Download size={15} />
          </button>
        )}
      />
      {uploading && (
        <DocumentUpload
          infoOptions={infos.options}
          onClose={() => setUploading(false)}
          onUploaded={() => { setUploading(false); setRefresh((n) => n + 1); }}
        />
      )}
    </>
  );
}
