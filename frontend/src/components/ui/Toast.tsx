"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts([{ id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000); // 4 seconds
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-2 right-2 md:top-3 md:right-4 z-[200] flex flex-col gap-2 pointer-events-none items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 md:gap-3 px-3 py-1.5 md:px-4 md:py-2.5 rounded-lg md:rounded-xl border shadow-2xl bg-zinc-950 backdrop-blur-md animate-in slide-in-from-top-2 md:slide-in-from-top-3 fade-in duration-300 ${
              t.type === 'success'
                ? 'border-green-500/50 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.15)]'
                : t.type === 'error'
                ? 'border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                : 'border-brand-primary/50 text-brand-secondary shadow-[0_0_15px_rgba(139,92,246,0.15)]'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 md:w-[18px] md:h-[18px]" />}
            {t.type === 'error' && <AlertCircle className="w-4 h-4 md:w-[18px] md:h-[18px]" />}
            {t.type === 'info' && <Info className="w-4 h-4 md:w-[18px] md:h-[18px]" />}
            <span className="font-medium text-xs md:text-sm whitespace-nowrap">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="ml-2 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
