import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DataSet, Network as VisNetwork } from 'vis-network/standalone';
import { Crosshair, Maximize2 } from 'lucide-react';
import { useFetch, useOptions, useTitle } from '../lib/hooks.js';
import { ENTITE_COLORS, TYPES_ENTITE } from '../lib/labels.js';
import { cssVar } from '../lib/charts.js';
import { Card, EmptyState, EntiteType, ErrorAlert, Field, Loading, PageHeader, Select } from '../components/ui.jsx';

export default function Reseau() {
  useTitle('Réseau relationnel');
  const [params, setParams] = useSearchParams();
  const entiteId = params.get('entiteId') || '';
  const profondeur = params.get('profondeur') || '2';
  const [types, setTypes] = useState(Object.keys(TYPES_ENTITE));
  const [selected, setSelected] = useState(null);
  const container = useRef(null);
  const network = useRef(null);

  const { data, error, loading } = useFetch('/analyse/reseau', { entiteId, profondeur: entiteId ? profondeur : undefined, typeEntite: types.join(',') });
  const entites = useOptions('/entites', { labelOf: (e) => `${e.nom} (${TYPES_ENTITE[e.typeEntite]})` });

  const set = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if (!data || !container.current) return undefined;
    const centre = Number(entiteId);
    const text = cssVar('--text');
    const degree = new Map();
    for (const l of data.liens) {
      degree.set(l.entiteSourceId, (degree.get(l.entiteSourceId) || 0) + 1);
      degree.set(l.entiteCibleId, (degree.get(l.entiteCibleId) || 0) + 1);
    }
    const nodes = new DataSet(data.noeuds.map((n) => ({
      id: n.id,
      label: n.nom,
      title: `${n.nom}${n.alias ? ` (${n.alias})` : ''} — ${TYPES_ENTITE[n.typeEntite]}`,
      shape: n.typeEntite === 'ORGANISATION' ? 'box' : n.typeEntite === 'VEHICULE' ? 'diamond' : n.typeEntite === 'LIEU' ? 'triangle' : 'dot',
      size: 12 + Math.min(18, (degree.get(n.id) || 0) * 3),
      color: { background: ENTITE_COLORS[n.typeEntite], border: n.id === centre ? '#111827' : '#ffffff', highlight: { background: ENTITE_COLORS[n.typeEntite], border: '#111827' } },
      borderWidth: n.id === centre ? 4 : 2,
      font: { color: n.typeEntite === 'ORGANISATION' ? '#ffffff' : text, size: 13, face: 'Inter', strokeWidth: n.typeEntite === 'ORGANISATION' ? 0 : 3, strokeColor: cssVar('--surface-2') },
      margin: 8,
    })));
    const edges = new DataSet(data.liens.map((l) => ({
      id: l.id,
      from: l.entiteSourceId,
      to: l.entiteCibleId,
      label: l.typeLien,
      arrows: 'to',
      dashes: l.fiabilite >= 4,
      width: l.fiabilite <= 2 ? 2.5 : 1.5,
      color: { color: cssVar('--border-strong'), highlight: '#2563eb' },
      font: { size: 11, color: cssVar('--text-3'), strokeWidth: 3, strokeColor: cssVar('--surface-2'), align: 'middle' },
      smooth: { type: 'continuous' },
    })));

    network.current = new VisNetwork(container.current, { nodes, edges }, {
      physics: { solver: 'forceAtlas2Based', forceAtlas2Based: { gravitationalConstant: -110, springLength: 170, avoidOverlap: 0.6 }, stabilization: { iterations: 200 } },
      interaction: { hover: true, tooltipDelay: 150, navigationButtons: false, keyboard: true },
    });
    network.current.on('click', (p) => {
      setSelected(p.nodes.length ? data.noeuds.find((n) => n.id === p.nodes[0]) : null);
    });
    network.current.on('doubleClick', (p) => {
      if (p.nodes.length) set({ entiteId: String(p.nodes[0]) });
    });
    return () => network.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const toggleType = (t) => setTypes((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]));
  const selectedLinks = selected ? data.liens.filter((l) => l.entiteSourceId === selected.id || l.entiteCibleId === selected.id) : [];
  const nameOf = (id) => data?.noeuds.find((n) => n.id === id)?.nom ?? `#${id}`;

  return (
    <>
      <PageHeader title="Réseau relationnel" subtitle="Graphe des liens entre entités. Cliquez sur un nœud pour le détail, double-cliquez pour centrer l'analyse." />
      <div className="grid grid--main-side">
        <Card
          flush
          title={data ? `${data.noeuds.length} entités · ${data.liens.length} liens` : 'Réseau'}
          actions={
            <>
              <div className="legend" aria-label="Légende">
                {Object.entries(TYPES_ENTITE).map(([k, v]) => <span key={k}><i style={{ background: ENTITE_COLORS[k] }} />{v}</span>)}
                <span>— — lien peu fiable</span>
              </div>
              <button type="button" className="btn btn--sm btn--icon" onClick={() => network.current?.fit({ animation: true })} aria-label="Recadrer le graphe" title="Recadrer"><Maximize2 size={15} /></button>
            </>
          }
        >
          {error && <div className="card__body"><ErrorAlert error={error} /></div>}
          {loading && !data && <Loading />}
          {data && !data.noeuds.length && <EmptyState title="Aucun lien à afficher" />}
          <div ref={container} className="network" role="img" aria-label="Graphe du réseau relationnel des entités" style={{ display: data?.noeuds.length ? 'block' : 'none' }} />
        </Card>

        <div className="stack">
          <Card title="Analyse">
            <div className="form">
              <Field label="Entité centrale" htmlFor="net-centre" hint="Laisser vide pour afficher tout le réseau">
                <Select id="net-centre" value={entiteId} onChange={(v) => { setSelected(null); set({ entiteId: v }); }} options={entites.options} placeholder="Tout le réseau" />
              </Field>
              <Field label="Profondeur" htmlFor="net-depth">
                <Select id="net-depth" value={profondeur} onChange={(v) => set({ profondeur: v })} placeholder={false} disabled={!entiteId}
                  options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: `${n} niveau${n > 1 ? 'x' : ''} de relation` }))} />
              </Field>
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="field__label" style={{ marginBottom: 6 }}>Types d'entité</legend>
                <div className="stack" style={{ gap: 6 }}>
                  {Object.entries(TYPES_ENTITE).map(([k, v]) => (
                    <label key={k} className="checkbox">
                      <input type="checkbox" checked={types.includes(k)} onChange={() => toggleType(k)} />
                      <i style={{ width: 10, height: 10, borderRadius: '50%', background: ENTITE_COLORS[k], display: 'inline-block' }} aria-hidden="true" />
                      {v}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </Card>

          <Card title="Sélection" flush>
            {selected ? (
              <>
                <div className="card__body">
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <strong>{selected.nom}</strong>
                    <EntiteType type={selected.typeEntite} />
                  </div>
                  {selected.alias && <div className="muted">alias {selected.alias}</div>}
                  <div className="row" style={{ marginTop: 12 }}>
                    <Link to={`/entites/${selected.id}`} className="btn btn--sm btn--primary">Ouvrir le dossier</Link>
                    <button type="button" className="btn btn--sm" onClick={() => set({ entiteId: String(selected.id) })}><Crosshair size={14} aria-hidden="true" /> Centrer</button>
                  </div>
                </div>
                <ul className="list" style={{ borderTop: '1px solid var(--border)' }}>
                  {selectedLinks.map((l) => (
                    <li key={l.id} style={{ fontSize: 13 }}>
                      {nameOf(l.entiteSourceId)} <span className="badge badge--primary">{l.typeLien}</span> {nameOf(l.entiteCibleId)}
                    </li>
                  ))}
                </ul>
              </>
            ) : <EmptyState title="Aucune sélection">Cliquez sur un nœud du graphe.</EmptyState>}
          </Card>
        </div>
      </div>
    </>
  );
}
