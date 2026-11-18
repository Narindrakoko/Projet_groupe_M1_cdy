import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, MapPin, Printer } from 'lucide-react';
import { useFetch, useOptions, useTitle } from '../lib/hooks.js';
import { IMPACTS, TYPES_ENTITE, toOptions } from '../lib/labels.js';
import { fmtDateTime, fmtMonth } from '../lib/format.js';
import { Card, EmptyState, ErrorAlert, Field, ImpactBadge, Loading, PageHeader, Select } from '../components/ui.jsx';

export default function Chronologie() {
  useTitle('Chronologie des événements');
  const [f, setF] = useState({ dateFrom: '', dateTo: '', impact: '', entiteId: '', order: 'desc' });
  const { data, error, loading } = useFetch('/evenements', {
    dateFrom: f.dateFrom, dateTo: f.dateTo, impact: f.impact, entiteId: f.entiteId, sort: 'dateDebut', order: f.order, pageSize: 500,
  });
  const entites = useOptions('/entites', { labelOf: (e) => `${e.nom} (${TYPES_ENTITE[e.typeEntite]})` });
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const groups = useMemo(() => {
    const out = [];
    for (const ev of data?.items ?? []) {
      const key = fmtMonth(ev.dateDebut);
      if (!out.length || out[out.length - 1].key !== key) out.push({ key, items: [] });
      out[out.length - 1].items.push(ev);
    }
    return out;
  }, [data]);

  return (
    <>
      <PageHeader
        title="Chronologie des événements"
        subtitle="Déroulé temporel des faits, regroupés par mois."
        actions={<button type="button" className="btn" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> Imprimer / PDF</button>}
      />
      <div className="grid grid--main-side">
        <div>
          {error && <ErrorAlert error={error} />}
          {loading && !data ? <Loading /> : !groups.length ? (
            <Card><EmptyState icon={CalendarClock} title="Aucun événement sur la période" /></Card>
          ) : (
            <ol className="timeline">
              {groups.map((g) => (
                <li key={g.key}>
                  <h2 className="timeline__month">{g.key}</h2>
                  <ol className="list" style={{ listStyle: 'none' }}>
                    {g.items.map((ev) => (
                      <li key={ev.id} className="timeline__item" style={{ display: 'block', padding: 0, border: 0 }}>
                        <span className={`timeline__dot timeline__dot--${ev.impact || ''}`} aria-hidden="true" />
                        <article className="card timeline__card">
                          <div className="row" style={{ justifyContent: 'space-between' }}>
                            <time className="timeline__date" dateTime={ev.dateDebut}>
                              {fmtDateTime(ev.dateDebut)}{ev.dateFin && ` → ${fmtDateTime(ev.dateFin)}`}
                            </time>
                            <ImpactBadge impact={ev.impact} />
                          </div>
                          <h3 style={{ margin: '6px 0 4px' }}>{ev.titre}</h3>
                          <div className="row muted" style={{ fontSize: 13 }}>
                            {ev.typeEvenement && <span>{ev.typeEvenement}</span>}
                            {ev.localisation && (
                              <Link to={`/carte?lieu=${ev.localisation.id}`} className="row" style={{ gap: 4 }}>
                                <MapPin size={13} aria-hidden="true" />{ev.localisation.nomLieu}
                              </Link>
                            )}
                          </div>
                          {ev.description && <p className="prose" style={{ marginTop: 8 }}>{ev.description}</p>}
                          {(ev.entites?.length > 0 || ev.information) && (
                            <div className="row" style={{ marginTop: 10, fontSize: 13 }}>
                              {ev.entites.map((e) => <Link key={e.id} to={`/entites/${e.id}`} className="badge badge--outline">{e.nom}</Link>)}
                              {ev.information && <Link to={`/informations/${ev.information.id}`} className="badge badge--primary">Info n° {ev.information.id}</Link>}
                            </div>
                          )}
                        </article>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="no-print">
          <Card title="Filtres">
            <div className="form">
              <Field label="À partir du" htmlFor="tl-from">
                <input id="tl-from" type="date" className="input" value={f.dateFrom} onChange={(e) => set('dateFrom')(e.target.value)} />
              </Field>
              <Field label="Jusqu'au" htmlFor="tl-to">
                <input id="tl-to" type="date" className="input" value={f.dateTo} onChange={(e) => set('dateTo')(e.target.value)} />
              </Field>
              <Field label="Impact" htmlFor="tl-impact">
                <Select id="tl-impact" value={f.impact} onChange={set('impact')} options={toOptions(IMPACTS)} />
              </Field>
              <Field label="Entité impliquée" htmlFor="tl-ent">
                <Select id="tl-ent" value={f.entiteId} onChange={set('entiteId')} options={entites.options} />
              </Field>
              <Field label="Ordre" htmlFor="tl-order">
                <Select id="tl-order" value={f.order} onChange={set('order')} placeholder={false} options={[{ value: 'desc', label: 'Plus récents d\'abord' }, { value: 'asc', label: 'Plus anciens d\'abord' }]} />
              </Field>
              {data && <p className="muted">{data.total} événement(s)</p>}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
