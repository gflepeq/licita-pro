"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

type Tipo = "ok" | "error";
type Toast = { id: number; msg: string; tipo: Tipo };

const Ctx = createContext<(msg: string, tipo?: Tipo) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((msg: string, tipo: Tipo = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, msg, tipo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex animate-fade-in items-center gap-2 rounded-xl border border-line bg-card px-4 py-3 text-sm font-medium text-ink shadow-lift"
          >
            {t.tipo === "ok" ? (
              <CheckCircle2 size={17} className="text-emerald-500" />
            ) : (
              <AlertCircle size={17} className="text-red-500" />
            )}
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
