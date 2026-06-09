import React, { createContext, useCallback, useContext, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';
type Toast = { id: string; type: ToastType; message: string };

const ToastContext = createContext<{ showToast: (type: ToastType, message: string) => void } | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = String(Date.now()) + Math.random().toString(36).slice(2, 7);
    const toast: Toast = { id, type, message };
    setToasts((t) => [toast, ...t]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3">
        {toasts.map((t) => (
          <div key={t.id} className={`rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3 ${
            t.type === 'success' ? 'bg-emerald-500 text-white' : t.type === 'error' ? 'bg-red-500 text-white' : 'bg-cyan-500 text-white'
          }`}>
            <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✗' : 'ℹ'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

export default useToast;





