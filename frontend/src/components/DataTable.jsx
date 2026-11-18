import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

/**
 * Tableau de données accessible : tri par en-tête, ligne cliquable (clavier compris).
 * columns : [{ key, label, render?, sortable?, className? }]
 */
export function DataTable({ columns, rows, sort, onSort, onRowClick, actions, caption }) {
  const sortIcon = (key) => {
    if (sort?.key !== key) return <ArrowUpDown size={13} aria-hidden="true" style={{ opacity: 0.5 }} />;
    return sort.order === 'asc' ? <ArrowUp size={13} aria-hidden="true" /> : <ArrowDown size={13} aria-hidden="true" />;
  };

  const toggle = (key) => {
    const order = sort?.key === key && sort.order === 'asc' ? 'desc' : 'asc';
    onSort({ key, order });
  };

  return (
    <div className="table-wrap">
      <table className="table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={c.className}
                aria-sort={sort?.key === c.key ? (sort.order === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                {c.sortable && onSort ? (
                  <button type="button" onClick={() => toggle(c.key)}>
                    {c.label} {sortIcon(c.key)}
                  </button>
                ) : (
                  c.label
                )}
              </th>
            ))}
            {actions && <th scope="col" className="actions"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id ?? JSON.stringify(row)}
              className={onRowClick ? 'is-clickable' : undefined}
              onClick={onRowClick ? (e) => { if (!e.target.closest('button, a, input')) onRowClick(row); } : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onRowClick(row); } : undefined}
              tabIndex={onRowClick ? 0 : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} className={c.className}>
                  {c.render ? c.render(row) : row[c.key] ?? <span className="muted">—</span>}
                </td>
              ))}
              {actions && <td className="actions">{actions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
