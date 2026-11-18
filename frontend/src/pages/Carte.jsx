import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { MapPin } from 'lucide-react';
import { useFetch, useTitle } from '../lib/hooks.js';
import { IMPACTS, IMPACT_COLORS, TYPES_ENTITE } from '../lib/labels.js';
import { fmtDate } from '../lib/format.js';
import { markerIcon } from '../lib/map.js';
import { Card, EmptyState, ErrorAlert, Field, ImpactBadge, Loading, PageHeader, Select } from '../components/ui.jsx';

const RANK = { FAIBLE: 1, MOYEN: 2, ELEVE: 3, CRITIQUE: 4 };
const maxImpact = (evs) => evs.reduce((m, e) => (RANK[e.impact] > (RANK[m] || 0) ? e.impact : m), null);

function FitBounds({ points, focus }) {
  const map = useMap();
  useEffect(() => {
    if (focus) {
      map.flyTo([focus.latitude, focus.longitude], 10, { duration: 0.8 });
    } else if (points.length) {
      map.fitBounds(points.map((p) => [p.latitude, p.longitude]), { padding: [40, 40], maxZoom: 8 });
    }
  }, [map, points, focus]);
  return null;
}

export default function Carte() {
  useTitle('Cartographie');
  const [params, setParams] = useSearchParams();
  const { data, error, loading } = useFetch('/analyse/carte');
  const [impact, setImpact] = useState('');
  const [mode, setMode] = useState('tous');
  const focusId = Number(params.get('lieu')) || null;

  const lieux = useMemo(() => {
    if (!data) return [];
    return data
      .map((l) => ({ ...l, evenements: impact ? l.evenements.filter((e) => e.impact === impact) : l.evenements }))
      .filter((l) => (mode === 'evenements' ? l.evenements.length : mode === 'entites' ? l.entites.length : true))
      .filter((l) => !impact || l.evenements.length);
  }, [data, impact, mode]);

  const focus = lieux.find((l) => l.id === focusId) || null;

  if (loading && !data) return <Loading />;
  if (error) return <ErrorAlert error={error} />;

  return (
    <>
      <PageHeader title="Cartographie" subtitle="Répartition géographique des événements et des entités. La couleur du marqueur indique l'impact maximal relevé sur le lieu." />
      <div className="grid grid--main-side">
        <Card
          flush
          title={`${lieux.length} lieu${lieux.length > 1 ? 'x' : ''} affiché${lieux.length > 1 ? 's' : ''}`}
          actions={
            <div className="legend" aria-label="Légende">
              {Object.entries(IMPACTS).map(([k, v]) => <span key={k}><i style={{ background: IMPACT_COLORS[k] }} />{v}</span>)}
              <span><i style={{ background: '#64748b' }} />Sans événement</span>
            </div>
          }
        >
          <MapContainer center={[-10, 40]} zoom={3} className="map" scrollWheelZoom>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FitBounds points={lieux} focus={focus} />
            {lieux.map((l) => {
              const imp = maxImpact(l.evenements);
              return (
                <Marker
                  key={l.id}
                  position={[l.latitude, l.longitude]}
                  icon={markerIcon(imp ? IMPACT_COLORS[imp] : '#64748b', l.evenements.length || '')}
                  eventHandlers={{ click: () => setParams({ lieu: l.id }, { replace: true }) }}
                  title={l.nomLieu}
                >
                  <Popup>
                    <strong>{l.nomLieu}</strong>
                    <div className="muted">{[l.typeLieu, l.pays].filter(Boolean).join(' · ')}</div>
                    {l.evenements.length > 0 && (
                      <>
                        <div style={{ marginTop: 8, fontWeight: 600 }}>Événements</div>
                        <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
                          {l.evenements.slice(0, 5).map((e) => <li key={e.id}>{fmtDate(e.dateDebut)} — {e.titre}</li>)}
                        </ul>
                      </>
                    )}
                    {l.entites.length > 0 && (
                      <>
                        <div style={{ marginTop: 8, fontWeight: 600 }}>Entités</div>
                        <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
                          {l.entites.map((e) => <li key={e.id}><Link to={`/entites/${e.id}`}>{e.nom}</Link></li>)}
                        </ul>
                      </>
                    )}
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </Card>

        <div className="stack">
          <Card title="Filtres">
            <div className="form">
              <Field label="Afficher" htmlFor="map-mode">
                <Select id="map-mode" value={mode} onChange={setMode} placeholder={false} options={[
                  { value: 'tous', label: 'Tous les lieux' },
                  { value: 'evenements', label: 'Lieux avec événements' },
                  { value: 'entites', label: 'Lieux avec entités' },
                ]} />
              </Field>
              <Field label="Impact des événements" htmlFor="map-impact">
                <Select id="map-impact" value={impact} onChange={setImpact} options={Object.entries(IMPACTS).map(([value, label]) => ({ value, label }))} />
              </Field>
            </div>
          </Card>

          <Card title={focus ? focus.nomLieu : 'Lieux'} subtitle={focus ? [focus.typeLieu, focus.pays].filter(Boolean).join(' · ') : 'Sélectionnez un lieu'} flush
            actions={focus && <button type="button" className="btn btn--ghost btn--sm" onClick={() => setParams({}, { replace: true })}>Tous</button>}
          >
            {focus ? (
              <ul className="list">
                {focus.evenements.map((e) => (
                  <li key={`e${e.id}`}>
                    <div className="list__main">
                      <div className="list__title">{e.titre}</div>
                      <div className="list__meta">{fmtDate(e.dateDebut)} · {e.typeEvenement}</div>
                    </div>
                    <ImpactBadge impact={e.impact} />
                  </li>
                ))}
                {focus.entites.map((e) => (
                  <li key={`n${e.id}`}>
                    <div className="list__main">
                      <Link to={`/entites/${e.id}`} className="list__title">{e.nom}</Link>
                      <div className="list__meta">{TYPES_ENTITE[e.typeEntite]}</div>
                    </div>
                  </li>
                ))}
                {!focus.evenements.length && !focus.entites.length && <li className="muted">Aucune donnée associée.</li>}
              </ul>
            ) : lieux.length ? (
              <ul className="list" style={{ maxHeight: 420, overflowY: 'auto' }}>
                {lieux.map((l) => (
                  <li key={l.id}>
                    <MapPin size={16} aria-hidden="true" className="muted" />
                    <div className="list__main">
                      <button type="button" className="btn btn--ghost btn--sm" style={{ padding: 0, height: 'auto' }} onClick={() => setParams({ lieu: l.id }, { replace: true })}>
                        <span className="list__title">{l.nomLieu}</span>
                      </button>
                      <div className="list__meta">{l.pays} · {l.evenements.length} év. · {l.entites.length} entité(s)</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="Aucun lieu géolocalisé" />}
          </Card>
        </div>
      </div>
    </>
  );
}
