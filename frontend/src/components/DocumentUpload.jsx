import { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { api } from '../lib/api.js';
import { fmtSize } from '../lib/format.js';
import { ErrorAlert, Field, Modal } from './ui.jsx';
import { useToast } from './Toast.jsx';

/** Fenêtre d'envoi d'un document rattaché à une information. */
export function DocumentUpload({ infoId, infoOptions, onClose, onUploaded }) {
  const toast = useToast();
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [target, setTarget] = useState(infoId ? String(infoId) : '');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return setError({ message: 'Sélectionnez un fichier à envoyer.' });
    if (!target) return setError({ message: "Choisissez l'information de rattachement." });
    const fd = new FormData();
    fd.append('infoId', target);
    fd.append('description', description);
    fd.append('fichier', file);
    setBusy(true);
    setError(null);
    try {
      await api.post('/documents', fd);
      toast.success('Document ajouté — empreinte SHA-256 calculée');
      onUploaded();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Ajouter un document"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Annuler</button>
          <button type="submit" form="upload-form" className="btn btn--primary" disabled={busy}>{busy ? 'Envoi…' : 'Envoyer'}</button>
        </>
      }
    >
      <form id="upload-form" className="form" onSubmit={submit} noValidate>
        <ErrorAlert error={error} />
        {!infoId && (
          <Field label="Information de rattachement" htmlFor="up-info" required>
            <select id="up-info" className="select" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">— Choisir —</option>
              {infoOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        )}
        <Field label="Fichier" htmlFor="up-file" required hint="Taille maximale : 25 Mo. Le fichier ne pourra plus être modifié (intégrité).">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); }}
            style={{
              border: `2px dashed ${drag ? 'var(--primary)' : 'var(--border-strong)'}`,
              background: drag ? 'var(--primary-soft)' : 'var(--surface-2)',
              borderRadius: 'var(--radius)', padding: 24, textAlign: 'center',
            }}
          >
            <UploadCloud size={28} aria-hidden="true" className="muted" />
            <p style={{ margin: '8px 0' }}>{file ? <strong>{file.name} ({fmtSize(file.size)})</strong> : 'Glissez-déposez un fichier ici ou'}</p>
            <button type="button" className="btn btn--sm" onClick={() => input.current.click()}>{file ? 'Changer de fichier' : 'Parcourir…'}</button>
            <input ref={input} id="up-file" type="file" className="sr-only" onChange={(e) => setFile(e.target.files[0] || null)} />
          </div>
        </Field>
        <Field label="Description" htmlFor="up-desc">
          <textarea id="up-desc" className="textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
