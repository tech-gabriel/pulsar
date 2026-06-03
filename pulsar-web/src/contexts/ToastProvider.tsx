import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type Toast, type ToastType } from './ToastContext';

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = ++nextId;
      setToasts((prev) => [...prev, { id, message, type }]);
      const timer = setTimeout(() => dismiss(id), 3000);
      timersRef.current.set(id, timer);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}
