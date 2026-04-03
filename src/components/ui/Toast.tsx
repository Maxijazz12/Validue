"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-[24px] left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-[8px] items-center pointer-events-none max-md:bottom-[80px]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-[20px] py-[12px] rounded-full font-mono text-[11px] font-medium uppercase tracking-wide shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl border animate-toast-in ${
              t.type === "success"
                ? "bg-accent/95 text-white border-white/10"
                : t.type === "error"
                  ? "bg-error/95 text-white border-red-300/20"
                  : "bg-white/95 text-text-primary border-border-light/60"
            }`}
          >
            {t.type === "success" && "✓ "}{t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
