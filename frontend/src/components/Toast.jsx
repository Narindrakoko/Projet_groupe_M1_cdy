import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback((type, message) => {
    const id = nextId++;
    setToasts((t) => [...t.slice(-3), { id, type, message }]);
    setTimeout(() => dismiss(id), type === 'error' ? 7000 : 4000);
  }, [dismiss]);

  const toast = useMemo(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m?.message ?? m),
    info: (m) => push('info', m),
  }), [push]);

  const icons = { success: CircleCheck, error: CircleAlert, info: Info };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <div key={t.id} className={`toast toast--${t.type}`}>
              <Icon size={18} aria-hidden="true" />
              <p>{t.message}</p>
              <button type="button" className="btn btn--ghost btn--sm btn--icon" onClick={() => dismiss(t.id)} aria-label="Fermer la notification">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
