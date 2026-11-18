import { Link } from 'react-router-dom';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Building2, CalendarDays, ClipboardCheck, FileText, Network, Radio } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { useFetch, useTitle } from '../lib/hooks.js';
import { baseOptions, doughnutOptions } from '../lib/charts.js';
import {
  CLASSIFICATIONS, ENTITE_COLORS, IMPACTS, IMPACT_COLORS, STATUTS_INFO, TYPES_ENTITE, TYPES_SOURCE_COURT,
} from '../lib/labels.js';
import { fmtDate, fmtMonth, fmtNum, fmtRelative, fullName } from '../lib/format.js';
import { Card, ClassifBadge, EmptyState, EntiteType, ErrorAlert, ImpactBadge, Loading, PageHeader, StatutBadge } from '../components/ui.jsx';

function Kpi({ icon: Icon, label, value, tone, to }) {
  const Comp = to ? Link : 'div';
  return (
    <Comp to={to} className={`card kpi ${tone ? `kpi--${tone}` : ''}`}>
      <span className="kpi__icon" aria-hidden="true"><Icon size={20} /></span>
      <div>
        <div className="kpi__label">{label}</div>
        <div className="kpi__value num">{fmtNum(value)}</div>
      </div>
    </Comp>
  );
}

const monthLabel = (m) => {
  const s = fmtMonth(`${m}-01T12:00:00`);
  return s.charAt(0).toUpperCase() + s.slice(1, 3) + '. ' + m.slice(2, 4);
};

export default function Dashboard() {
  useTitle('Tableau de bord');
  const { user, can } = useAuth();
  const { data, error, loading } = useFetch('/stats');

  if (loading && !data) return <Loading />;
  if (error) return <ErrorAlert error={error} />;
  const s = data;
  const t = s.totaux;

  const activity = {
    labels: s.informationsParMois.map((m) => monthLabel(m.mois)),
    datasets: [
      { label: 'Informations enregistrées', data: s.informationsParMois.map((m) => m.total), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.12)', fill: true, tension: 0.3, cubicInterpolationMode: 'monotone', pointRadius: 3 },
      { label: 'Événements', data: s.evenementsParMois.map((m) => m.total), borderColor: '#d97706', backgroundColor: 'transparent', tension: 0.3, cubicInterpolationMode: 'monotone', pointRadius: 3, borderDash: [5, 4] },
    ],
  };

  const statutColors = { BRUT: '#d97706', VALIDE: '#15803d', ARCHIVE: '#94a3b8' };
  const statuts = Object.keys(STATUTS_INFO);
  const statutData = {
    labels: statuts.map((k) => STATUTS_INFO[k]),
    datasets: [{ data: statuts.map((k) => s.informationsParStatut[k] || 0), backgroundColor: statuts.map((k) => statutColors[k]), borderWidth: 0 }],
  };

  const classifs = Object.keys(CLASSIFICATIONS).filter((k) => Number(k) <= user.niveauHabilitation);
  const classifData = {
    labels: classifs.map((k) => CLASSIFICATIONS[k]),
    datasets: [{ data: classifs.map((k) => s.informationsParClassification[k] || 0), backgroundColor: ['#94a3b8', '#0369a1', '#d97706', '#b91c1c'].slice(0, classifs.length), borderRadius: 4, maxBarThickness: 42 }],
  };

  const impacts = Object.keys(IMPACTS);
  const impactData = {
    labels: impacts.map((k) => IMPACTS[k]),
    datasets: [{ data: impacts.map((k) => s.evenementsParImpact[k] || 0), backgroundColor: impacts.map((k) => IMPACT_COLORS[k]), borderRadius: 4, maxBarThickness: 42 }],
  };

  const sources = Object.keys(TYPES_SOURCE_COURT).filter((k) => s.sourcesParType[k]);
  const sourceData = {
    labels: sources.map((k) => TYPES_SOURCE_COURT[k]),
    datasets: [{ data: sources.map((k) => s.sourcesParType[k]), backgroundColor: ['#2563eb', '#7c3aed', '#059669', '#d97706', '#64748b'], borderWidth: 0 }],
  };

  const hour = new Date().getHours();
  const greeting = hour < 18 ? 'Bonjour' : 'Bonsoir';

  return (
    <div className="stack">
      <PageHeader
        title={`${greeting}, ${fullName(user)}`}
        subtitle={`Situation au ${fmtDate(new Date())} — données visibles jusqu'au niveau « ${CLASSIFICATIONS[user.niveauHabilitation]} ».`}
        actions={can('informations', 'create') && <Link to="/recherche?nouveau=1" className="btn btn--primary">Saisir une information</Link>}
      />

      <div className="grid grid--kpi">
        <Kpi icon={FileText} label="Informations" value={t.informations} to="/recherche" />
        <Kpi icon={ClipboardCheck} label="À valider" value={t.aValider} tone="warning" to="/recherche?statut=BRUT" />
        <Kpi icon={Building2} label="Entités suivies" value={t.entites} tone="info" to="/entites" />
        <Kpi icon={Network} label="Liens identifiés" value={t.liens} tone="info" to="/reseau" />
        <Kpi icon={CalendarDays} label="Événements" value={t.evenements} tone="danger" to="/chronologie" />
        <Kpi icon={Radio} label="Sources" value={t.sources} tone="success" to="/sources" />
      </div>

      <div className="grid grid--main-side">
        <Card title="Activité sur 12 mois" subtitle="Informations enregistrées et événements survenus par mois">
          <div className="chart-box" role="img" aria-label="Courbe d'activité mensuelle">
            <Line data={activity} options={baseOptions({ legend: true })} />
          </div>
        </Card>
        <Card title="Statut des informations" subtitle="Cycle de traitement">
          <div className="chart-box" role="img" aria-label="Répartition des informations par statut">
            <Doughnut data={statutData} options={doughnutOptions()} />
          </div>
        </Card>
      </div>

      <div className="grid grid--3">
        <Card title="Par classification">
          <div className="chart-box" style={{ height: 220 }} role="img" aria-label="Informations par niveau de classification">
            <Bar data={classifData} options={baseOptions()} />
          </div>
        </Card>
        <Card title="Événements par impact">
          <div className="chart-box" style={{ height: 220 }} role="img" aria-label="Événements par niveau d'impact">
            <Bar data={impactData} options={baseOptions()} />
          </div>
        </Card>
        <Card title="Sources par type">
          <div className="chart-box" style={{ height: 220 }} role="img" aria-label="Sources par type de renseignement">
            <Doughnut data={sourceData} options={doughnutOptions()} />
          </div>
        </Card>
      </div>

      <div className="grid grid--3">
        <Card title="Dernières informations" flush actions={<Link to="/recherche" className="btn btn--ghost btn--sm">Tout voir</Link>}>
          {s.informationsRecentes.length ? (
            <ul className="list">
              {s.informationsRecentes.map((i) => (
                <li key={i.id}>
                  <div className="list__main">
                    <Link to={`/informations/${i.id}`} className="list__title">{i.titre}</Link>
                    <div className="list__meta">{fmtRelative(i.dateEnregistrement)}</div>
                  </div>
                  <div className="stack" style={{ gap: 4, alignItems: 'flex-end' }}>
                    <StatutBadge statut={i.statut} />
                    <ClassifBadge niveau={i.niveauClassification} />
                  </div>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="Aucune information" />}
        </Card>

        <Card title="Événements récents" flush actions={<Link to="/chronologie" className="btn btn--ghost btn--sm">Chronologie</Link>}>
          {s.evenementsRecents.length ? (
            <ul className="list">
              {s.evenementsRecents.map((e) => (
                <li key={e.id}>
                  <div className="list__main">
                    <div className="list__title">{e.titre}</div>
                    <div className="list__meta">{fmtDate(e.dateDebut)}{e.localisation && ` · ${e.localisation.nomLieu}`}</div>
                  </div>
                  <ImpactBadge impact={e.impact} />
                </li>
              ))}
            </ul>
          ) : <EmptyState title="Aucun événement" />}
        </Card>

        <Card title="Entités clés" subtitle="Les plus connectées" flush actions={<Link to="/reseau" className="btn btn--ghost btn--sm">Réseau</Link>}>
          {s.entitesCles.length ? (
            <ul className="list">
              {s.entitesCles.map((e) => (
                <li key={e.id}>
                  <span className="avatar" style={{ background: `${ENTITE_COLORS[e.typeEntite]}1f`, color: ENTITE_COLORS[e.typeEntite] }} aria-hidden="true">
                    {e.nom[0]}
                  </span>
                  <div className="list__main">
                    <Link to={`/entites/${e.id}`} className="list__title">{e.nom}</Link>
                    <div className="list__meta">{TYPES_ENTITE[e.typeEntite]} · {e.liens} lien(s) · {e.informations} info(s)</div>
                  </div>
                  <EntiteType type={e.typeEntite} />
                </li>
              ))}
            </ul>
          ) : <EmptyState title="Aucune entité" />}
        </Card>
      </div>
    </div>
  );
}
