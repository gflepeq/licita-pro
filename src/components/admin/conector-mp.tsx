"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Plug, RefreshCw, XCircle } from "lucide-react";
import { sincronizarMPAction } from "@/lib/actions/admin";

export interface EstadoConector {
  ticket: boolean;
  compraAgil: boolean;
  ia: boolean;
  ultimoError: string | null;
  poolTs: number | null;
  total: number;
  enriquecidas: number;
}

export function ConectorMP({ estado }: { estado: EstadoConector }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");

  const fila = (ok: boolean, label: string, detalle?: string) => (
    <li className="flex items-center gap-2.5 text-sm">
      {ok ? <CheckCircle2 size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
      <span className="text-ink">{label}</span>
      {detalle && <span className="text-xs text-muted">· {detalle}</span>}
    </li>
  );

  return (
    <section className="card mt-6 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold text-ink">
          <Plug size={17} className="text-brand-600" /> Conector Mercado Público
        </h2>
        <button
          disabled={pending || !estado.ticket}
          onClick={() =>
            start(async () => {
              const r = await sincronizarMPAction();
              setMsg(r.ok ? `Sincronizado: ${r.total} vigentes, ${r.enriquecidas} con detalle.` : "Otra sincronización está en curso o la API no respondió.");
            })
          }
          className="btn-secondary py-2"
        >
          {pending ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          Sincronizar ahora
        </button>
      </div>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {fila(estado.ticket, "Ticket API v1 (licitaciones)", estado.ticket ? undefined : "define MERCADO_PUBLICO_TICKET")}
        {fila(estado.compraAgil, "API v2 Compra Ágil")}
        {fila(estado.ia, "IA para análisis de bases", estado.ia ? undefined : "define ANTHROPIC_API_KEY")}
        {fila(
          !!estado.poolTs,
          "Caché de oportunidades",
          estado.poolTs
            ? `${estado.total} vigentes · ${estado.enriquecidas} con detalle · ${new Date(estado.poolTs).toLocaleString("es-CL", { timeZone: "America/Santiago" })}`
            : "sin datos aún"
        )}
      </ul>
      {estado.ultimoError && <p className="mt-3 text-xs text-muted">Último error de la API: {estado.ultimoError}</p>}
      {msg && <p className="mt-3 text-sm text-ink">{msg}</p>}
    </section>
  );
}
