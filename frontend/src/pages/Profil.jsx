import { useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useTitle } from '../lib/hooks.js';
import { ROLES } from '../lib/labels.js';
import { fmtDateTime, fullName, initials } from '../lib/format.js';
import { useToast } from '../components/Toast.jsx';
import { Card, ClassifBadge, ErrorAlert, Field, PageHeader } from '../components/ui.jsx';

const RIGHTS = {
  informations: 'Informations', sources: 'Sources', collectes: 'Collectes', entites: 'Entités', liens: 'Liens',
  evenements: 'Événements', localisations: 'Localisations', documents: 'Documents', tags: 'Tags', utilisateurs: 'Utilisateurs',
};
const ACTIONS = [['read', 'Lecture'], ['create', 'Création'], ['update', 'Modification'], ['delete', 'Suppression']];

export default function Profil() {
  useTitle('Mon profil');
  const { user, can } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ ancienMotDePasse: '', nouveauMotDePasse: '', confirmation: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.nouveauMotDePasse !== form.confirmation) return setError({ message: 'La confirmation ne correspond pas au nouveau mot de passe.' });
    if (form.nouveauMotDePasse.length < 10 || !/[A-Za-z]/.test(form.nouveauMotDePasse) || !/\d/.test(form.nouveauMotDePasse)) {
      return setError({ message: 'Le mot de passe doit contenir au moins 10 caractères, dont des lettres et des chiffres.' });
    }
    setBusy(true);
    try {
      await api.put('/auth/password', { ancienMotDePasse: form.ancienMotDePasse, nouveauMotDePasse: form.nouveauMotDePasse });
      toast.success('Mot de passe modifié');
      setForm({ ancienMotDePasse: '', nouveauMotDePasse: '', confirmation: '' });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const input = (name, label, autoComplete) => (
    <Field label={label} htmlFor={`p-${name}`} required>
      <input id={`p-${name}`} type="password" className="input" autoComplete={autoComplete} value={form[name]} onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))} />
    </Field>
  );

  return (
    <>
      <PageHeader title="Mon profil" subtitle="Informations de compte et sécurité." />
      <div className="grid grid--2">
        <div className="stack">
          <Card title="Identité">
            <div className="row" style={{ gap: 16, marginBottom: 20 }}>
              <span className="avatar avatar--lg" aria-hidden="true">{initials(user)}</span>
              <div>
                <strong style={{ fontSize: 16 }}>{fullName(user)}</strong>
                <div className="muted">{user.email}</div>
              </div>
            </div>
            <dl className="dl">
              <dt>Rôle</dt><dd>{ROLES[user.role]}</dd>
              <dt>Grade</dt><dd>{user.grade || '—'}</dd>
              <dt>Service</dt><dd>{user.service || '—'}</dd>
              <dt>Habilitation</dt><dd><ClassifBadge niveau={user.niveauHabilitation} /></dd>
              <dt>Dernière connexion</dt><dd>{fmtDateTime(user.derniereConnexion)}</dd>
            </dl>
          </Card>
          <Card title="Mes droits" flush>
            <div className="table-wrap">
              <table className="table">
                <caption className="sr-only">Droits par type de donnée</caption>
                <thead><tr><th scope="col">Donnée</th>{ACTIONS.map(([, l]) => <th key={l} scope="col">{l}</th>)}</tr></thead>
                <tbody>
                  {Object.entries(RIGHTS).map(([res, label]) => (
                    <tr key={res}>
                      <th scope="row" style={{ textTransform: 'none', fontSize: 14, background: 'transparent', color: 'var(--text)', fontWeight: 500, letterSpacing: 0 }}>{label}</th>
                      {ACTIONS.map(([act, l]) => (
                        <td key={act} aria-label={`${l} : ${can(res, act) ? 'autorisé' : 'non autorisé'}`}>
                          {can(res, act) ? <span style={{ color: 'var(--success)', fontWeight: 700 }}>✓</span> : <span className="muted">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
        <Card title="Changer de mot de passe">
          <form className="form" onSubmit={submit} noValidate>
            <ErrorAlert error={error} />
            {input('ancienMotDePasse', 'Mot de passe actuel', 'current-password')}
            {input('nouveauMotDePasse', 'Nouveau mot de passe', 'new-password')}
            {input('confirmation', 'Confirmation', 'new-password')}
            <p className="field__hint">Au moins 10 caractères, dont des lettres et des chiffres.</p>
            <div><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Enregistrement…' : 'Mettre à jour'}</button></div>
          </form>
        </Card>
      </div>
    </>
  );
}
