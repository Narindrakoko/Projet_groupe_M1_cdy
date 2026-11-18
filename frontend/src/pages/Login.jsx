import { useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Briefcase, Eye, EyeOff, FolderSearch, LockKeyhole, Map as MapIcon, Network, Radio, Search, Shield, ShieldCheck, UserCheck,
} from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { useTitle } from '../lib/hooks.js';
import { ErrorAlert, Field } from '../components/ui.jsx';

/**
 * Profils proposés à la connexion : un clic remplit uniquement l'adresse e-mail.
 * Le mot de passe n'est jamais affiché ni prérempli.
 * Mettre VITE_LOGIN_PROFILES=false dans frontend/.env pour masquer ce choix.
 */
const PROFILES = [
  { email: 'admin@projet.local', role: 'Administrateur', desc: 'Comptes et paramétrage', icon: ShieldCheck },
  { email: 'responsable@projet.local', role: 'Responsable', desc: 'Validation, audit', icon: UserCheck },
  { email: 'analyste@projet.local', role: 'Analyste', desc: 'Analyse, dossiers', icon: Search },
  { email: 'decideur@projet.local', role: 'Décideur', desc: 'Consultation, synthèses', icon: Briefcase },
  { email: 'operateur@projet.local', role: 'Opérateur terrain', desc: 'Saisie des collectes', icon: Radio },
];
const SHOW_PROFILES = import.meta.env.VITE_LOGIN_PROFILES !== 'false';

export default function Login() {
  useTitle('Connexion');
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef(null);

  if (user) return <Navigate to="/" replace />;

  const chooseProfile = (profile) => {
    setEmail(profile.email);
    setMotDePasse('');
    setError(null);
    passwordRef.current?.focus();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !motDePasse) {
      setError({ message: 'Veuillez saisir votre adresse e-mail et votre mot de passe.' });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(email, motDePasse);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <aside className="login__aside" aria-hidden="true">
        <div className="row" style={{ color: '#fff', fontWeight: 650, fontSize: 16 }}>
          <span className="sidebar__logo"><Shield size={18} /></span> Sentinelle
        </div>
        <div>
          <h1>Centraliser, recouper et exploiter le renseignement.</h1>
          <p>De la collecte à la décision : sources cotées, dossiers d'entités, analyse relationnelle et cartographique, traçabilité complète des accès.</p>
          <ul className="login__features">
            <li><FolderSearch size={20} /> Recherche multicritères et dossiers par entité</li>
            <li><Network size={20} /> Analyse du réseau relationnel</li>
            <li><MapIcon size={20} /> Cartographie et chronologie des événements</li>
            <li><LockKeyhole size={20} /> Accès selon l'habilitation, journal d'audit</li>
          </ul>
        </div>
        <small style={{ color: '#7d8ba1' }}>Accès réservé aux personnels habilités. Toute connexion est journalisée.</small>
      </aside>

      <main className="login__main">
        <div className="login__card">
          <h2>Connexion</h2>
          <p className="muted" style={{ marginBottom: 24 }}>Identifiez-vous pour accéder à la plateforme.</p>

          <form className="form" onSubmit={submit} noValidate>
            <ErrorAlert error={error} />
            {SHOW_PROFILES && (
              <fieldset className="profiles">
                <legend className="field__label">Choisissez votre profil</legend>
                <div className="profiles__grid" role="radiogroup" aria-label="Profil utilisateur">
                  {PROFILES.map((p) => {
                    const Icon = p.icon;
                    const selected = email === p.email;
                    return (
                      <button
                        key={p.email}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`profile ${selected ? 'is-selected' : ''}`}
                        onClick={() => chooseProfile(p)}
                      >
                        <span className="profile__icon" aria-hidden="true"><Icon size={18} /></span>
                        <span>
                          <span className="profile__role">{p.role}</span>
                          <span className="profile__desc">{p.desc}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}
            <Field label="Adresse e-mail" htmlFor="email" required>
              <input id="email" type="email" className="input" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus={!SHOW_PROFILES} />
            </Field>
            <Field label="Mot de passe" htmlFor="password" required>
              <div style={{ position: 'relative' }}>
                <input ref={passwordRef} id="password" type={show ? 'text' : 'password'} className="input" autoComplete="current-password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} style={{ paddingRight: 44 }} />
                <button type="button" className="btn btn--ghost btn--sm btn--icon" onClick={() => setShow((s) => !s)} aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={show} style={{ position: 'absolute', right: 4, top: 4 }}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            <button type="submit" className="btn btn--primary" style={{ height: 42 }} disabled={busy}>
              {busy ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
