import { Suspense, lazy } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { Compass, ShieldAlert } from 'lucide-react';
import { RequireAuth } from './lib/auth.jsx';
import { Layout } from './components/Layout.jsx';
import { EmptyState, Loading } from './components/ui.jsx';
import Login from './pages/Login.jsx';
import Recherche from './pages/Recherche.jsx';
import InformationDetail from './pages/InformationDetail.jsx';
import Chronologie from './pages/Chronologie.jsx';
import Documents from './pages/Documents.jsx';
import Historique from './pages/Historique.jsx';
import Profil from './pages/Profil.jsx';
import {
  CollectesPage, EntitesPage, EvenementsPage, LiensPage, LocalisationsPage, SourcesPage, TagsPage, UtilisateursPage,
} from './pages/resources.jsx';

// Pages lourdes (graphiques, cartographie, graphe) chargées à la demande
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const EntiteDossier = lazy(() => import('./pages/EntiteDossier.jsx'));
const Carte = lazy(() => import('./pages/Carte.jsx'));
const Reseau = lazy(() => import('./pages/Reseau.jsx'));

const guard = (resource, element) => (
  <RequireAuth resource={resource}>
    <Suspense fallback={<Loading />}>{element}</Suspense>
  </RequireAuth>
);

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<Login />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Suspense fallback={<Loading />}><Dashboard /></Suspense>} />
        <Route path="recherche" element={guard('informations', <Recherche />)} />
        <Route path="informations/:id" element={guard('informations', <InformationDetail />)} />
        <Route path="entites" element={guard('entites', <EntitesPage />)} />
        <Route path="entites/:id" element={guard('entites', <EntiteDossier />)} />
        <Route path="reseau" element={guard('liens', <Reseau />)} />
        <Route path="carte" element={guard('localisations', <Carte />)} />
        <Route path="chronologie" element={guard('evenements', <Chronologie />)} />
        <Route path="sources" element={guard('sources', <SourcesPage />)} />
        <Route path="collectes" element={guard('collectes', <CollectesPage />)} />
        <Route path="evenements" element={guard('evenements', <EvenementsPage />)} />
        <Route path="liens" element={guard('liens', <LiensPage />)} />
        <Route path="localisations" element={guard('localisations', <LocalisationsPage />)} />
        <Route path="documents" element={guard('documents', <Documents />)} />
        <Route path="tags" element={guard('tags', <TagsPage />)} />
        <Route path="utilisateurs" element={guard('utilisateurs', <UtilisateursPage />)} />
        <Route path="historique" element={guard('audit', <Historique />)} />
        <Route path="profil" element={<Profil />} />
        <Route path="acces-refuse" element={
          <EmptyState icon={ShieldAlert} title="Accès refusé">
            Votre rôle ne permet pas d'accéder à cette page. <Link to="/">Retour au tableau de bord</Link>
          </EmptyState>
        } />
        <Route path="*" element={
          <EmptyState icon={Compass} title="Page introuvable">
            L'adresse demandée n'existe pas. <Link to="/">Retour au tableau de bord</Link>
          </EmptyState>
        } />
      </Route>
    </Routes>
  );
}
