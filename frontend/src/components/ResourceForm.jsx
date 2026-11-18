import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { useOptions } from '../lib/hooks.js';
import { toInputDate, toInputDateTime } from '../lib/format.js';
import { ErrorAlert, Field } from './ui.jsx';

/* Suggestions issues des valeurs déjà saisies (types de lien, pays, etc.) */
let refCache = null;
let refPromise = null;
function useReferentiels() {
  const [data, setData] = useState(refCache || {});
  useEffect(() => {
    if (refCache) return;
    refPromise ??= api.get('/referentiels').then((d) => (refCache = d)).catch(() => ({}));
    refPromise.then((d) => setData(d || {}));
  }, []);
  return data;
}
export const resetReferentiels = () => { refCache = null; refPromise = null; };

/** Valeur de formulaire à partir d'un enregistrement existant. */
function toFormValue(f, item) {
  if (f.fromItem) return f.fromItem(item);
  const v = item?.[f.name];
  if (v === null || v === undefined) return f.type === 'multirelation' ? [] : f.type === 'checkbox' ? false : '';
  switch (f.type) {
    case 'date': return toInputDate(v);
    case 'datetime': return toInputDateTime(v);
    case 'multirelation': return v.map((x) => String(x.id ?? x));
    case 'json': return typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v);
    case 'password': return '';
    default: return String(v);
  }
}

/** Valeur envoyée à l'API. */
function toBodyValue(f, v) {
  if (f.toBody) return f.toBody(v);
  if (v === '' || v === undefined) return f.type === 'multirelation' ? [] : null;
  switch (f.type) {
    case 'number': return Number(String(v).replace(',', '.'));
    case 'datetime': return new Date(v).toISOString();
    case 'multirelation': return v.map(Number);
    case 'relation': return Number(v);
    default: return v;
  }
}

export function buildInitial(fields, item) {
  return Object.fromEntries(fields.map((f) => [f.name, item ? toFormValue(f, item) : f.default ?? (f.type === 'multirelation' ? [] : '')]));
}

export function buildBody(fields, values) {
  const body = {};
  for (const f of fields) {
    if (f.readOnly) continue;
    if (f.type === 'password' && !values[f.name]) continue;
    body[f.name] = toBodyValue(f, values[f.name]);
  }
  return body;
}

function RelationSelect({ field, id, value, onChange, invalid }) {
  const { options, loading } = useOptions(field.endpoint, { labelOf: field.labelOf });
  return (
    <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid || undefined} required={field.required}>
      <option value="">{loading ? 'Chargement…' : field.placeholder ?? '— Aucun —'}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function MultiSelect({ id, endpoint, labelOf, value = [], onChange, placeholder = 'Rechercher…' }) {
  const { options, loading } = useOptions(endpoint, { labelOf });
  const [q, setQ] = useState('');
  const selected = useMemo(() => new Set(value), [value]);
  const filtered = options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())).slice(0, 100);
  const toggle = (v) => onChange(selected.has(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <div className="multiselect">
      <div className="multiselect__chips">
        {options.filter((o) => selected.has(o.value)).map((o) => (
          <span key={o.value} className="chip">
            {o.label}
            <button type="button" onClick={() => toggle(o.value)} aria-label={`Retirer ${o.label}`}><X size={12} /></button>
          </span>
        ))}
      </div>
      <div className="input-icon">
        <Search size={15} aria-hidden="true" />
        <input id={id} className="multiselect__search" style={{ paddingLeft: 34 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      </div>
      <ul className="multiselect__list" role="listbox" aria-multiselectable="true">
        {loading && <li className="multiselect__empty">Chargement…</li>}
        {!loading && !filtered.length && <li className="multiselect__empty">Aucune option</li>}
        {filtered.map((o) => (
          <li key={o.value} role="option" aria-selected={selected.has(o.value)}>
            <label>
              <input type="checkbox" checked={selected.has(o.value)} onChange={() => toggle(o.value)} />
              {o.label}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Control({ field: f, id, value, onChange, invalid, refs }) {
  const common = { id, 'aria-invalid': invalid || undefined, required: f.required, disabled: f.readOnly, 'aria-describedby': f.hint ? `${id}-hint` : undefined };
  switch (f.type) {
    case 'textarea':
    case 'json':
      return <textarea className="textarea" rows={f.rows || 4} value={value} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} {...common} style={f.type === 'json' ? { fontFamily: 'var(--mono)', fontSize: 13 } : undefined} />;
    case 'select':
      return (
        <select className="select" value={value} onChange={(e) => onChange(e.target.value)} {...common}>
          {!f.required || f.placeholder ? <option value="">{f.placeholder ?? '— Non renseigné —'}</option> : null}
          {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case 'relation':
      return <RelationSelect field={f} id={id} value={value} onChange={onChange} invalid={invalid} />;
    case 'multirelation':
      return <MultiSelect id={id} endpoint={f.endpoint} labelOf={f.labelOf} value={value} onChange={onChange} />;
    case 'date':
      return <input type="date" className="input" value={value} onChange={(e) => onChange(e.target.value)} {...common} />;
    case 'datetime':
      return <input type="datetime-local" className="input" value={value} onChange={(e) => onChange(e.target.value)} {...common} />;
    case 'number':
      return <input type="number" inputMode="decimal" className="input" value={value} min={f.min} max={f.max} step={f.step ?? 'any'} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} {...common} />;
    default: {
      const list = f.suggestions ? `${id}-list` : undefined;
      return (
        <>
          <input type={f.type || 'text'} className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} list={list} autoComplete={f.type === 'password' ? 'new-password' : f.autoComplete ?? 'off'} maxLength={f.maxLength} {...common} />
          {list && (
            <datalist id={list}>
              {(refs[f.suggestions] || []).map((s) => <option key={s} value={s} />)}
            </datalist>
          )}
        </>
      );
    }
  }
}

/**
 * Formulaire généré à partir d'une configuration de champs.
 * Le bouton d'envoi peut être placé ailleurs via l'attribut form={formId}.
 */
export function ResourceForm({ formId, fields, initial, onSubmit, error }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const refs = useReferentiels();

  const set = (name, v) => {
    setValues((s) => ({ ...s, [name]: v }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const visible = fields.filter((f) => !f.showIf || f.showIf(values));

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    for (const f of visible) {
      const v = values[f.name];
      const empty = v === '' || v === null || v === undefined || (Array.isArray(v) && !v.length);
      if (f.required && empty) errs[f.name] = 'Ce champ est obligatoire';
      else if (f.validate && !empty) {
        const msg = f.validate(v, values);
        if (msg) errs[f.name] = msg;
      }
    }
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`${formId}-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    onSubmit(buildBody(visible, values), values);
  };

  const serverFields = error?.details?.champs || [];

  return (
    <form id={formId} className="form" onSubmit={submit} noValidate>
      <ErrorAlert error={error} />
      <div className="form-grid">
        {visible.map((f) => {
          const id = `${formId}-${f.name}`;
          const err = errors[f.name] || (serverFields.includes(f.name) ? 'Ce champ est obligatoire' : undefined);
          return (
            <Field key={f.name} label={f.label} htmlFor={id} required={f.required} hint={f.hint} error={err} className={f.span === 2 || ['textarea', 'multirelation', 'json'].includes(f.type) ? 'span-2' : ''}>
              <Control field={f} id={id} value={values[f.name] ?? ''} onChange={(v) => set(f.name, v)} invalid={Boolean(err)} refs={refs} />
            </Field>
          );
        })}
      </div>
      <p className="field__hint"><span aria-hidden="true" style={{ color: 'var(--danger)' }}>*</span> Champ obligatoire</p>
    </form>
  );
}
