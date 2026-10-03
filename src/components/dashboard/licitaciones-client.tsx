"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bookmark,
  Building2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Radio,
  RotateCcw,
  Search,
  SearchX,
  Sparkles,
  X,
} from "lucide-react";
import {
  CierreBadge,
  EmptyState,
  ScoreBadge,
  TipoBadge,
} from "@/components/dashboard/ui";
import { LicitacionModal } from "@/components/dashboard/licitacion-modal";
import { PlanLock } from "@/components/dashboard/plan-lock";
import { toggleSavedAction } from "@/lib/actions/saved";
import { fmtCLPCorto, type Licitacion } from "@/lib/data";

type Filtros = {
  q: string;
  tipo: string;
  region: string;
  cierre: string;
  monto: string;
  soloRubros: boolean;
  orden: string;
};

type Resultado = {
  items: Licitacion[];
  total: number;
  pagina: number;
  paginas: number;
  totalCatalogo: number;
  regiones: string[];
};

const nf = new Intl.NumberFormat("es-CL");

export function LicitacionesClient({
  resultado,
  savedCodes,
  filtros,
  rubros,
  puedeRegion,
  puedeBuscar,
  tiposPermitidos,
}: {
  resultado: Resultado;
  savedCodes: string[];
  filtros: Filtros;
  rubros: string[];
  puedeRegion: boolean;
  puedeBuscar: boolean;
  tiposPermitidos: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [term, setTerm] = useState(filtros.q);
  const [selected, setSelected] = useState<Licitacion | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>(
    Object.fromEntries(savedCodes.map((c) => [c, true]))
  );

  // Aplica cambios de filtro vía URL (la búsqueda corre en el servidor).
  const aplicar = (cambios: Partial<Record<keyof Filtros | "p", string>>) => {
    const sp = new URLSearchParams();
    const next = {
      q: filtros.q,
      tipo: filtros.tipo,
      region: filtros.region,
      cierre: filtros.cierre,
      monto: filtros.monto,
      rubros: filtros.soloRubros ? "1" : "",
      orden: filtros.orden === "relevancia" ? "" : filtros.orden,
      ...Object.fromEntries(
        Object.entries(cambios).map(([k, v]) => [k === "soloRubros" ? "rubros" : k, v])
      ),
    } as Record<string, string>;
    for (const [k, v] of Object.entries(next)) if (v) sp.set(k, v);
    startTransition(() => router.push(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false }));
  };

  const toggleSave = (l: Licitacion) => {
    const nuevo = !saved[l.codigo];
    setSaved((s) => ({ ...s, [l.codigo]: nuevo }));
    startTransition(async () => {
      const r = await toggleSavedAction(l);
      if (r.limit) {
        setSaved((s) => ({ ...s, [l.codigo]: false }));
        alert("Alcanzaste el límite de 15 oportunidades guardadas de tu plan. Mejora tu plan para guardar más.");
      }
    });
  };

  const hayFiltros =
    !!(filtros.q || filtros.tipo || filtros.region || filtros.cierre || filtros.monto || filtros.soloRubros) ||
    filtros.orden !== "relevancia";

  const chip = (activo: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
      activo
        ? "border-brand-600 bg-brand-600 text-white shadow-sm shadow-brand-600/25"
        : "border-line bg-card text-ink/75 hover:border-brand-600/40 hover:text-ink"
    }`;
  const select =
    "rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink/80 focus:border-brand-600 focus:outline-none";

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">Licitaciones</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500/10 px-2.5 py-1 text-xs font-semibold text-accent-600">
              <Radio size={12} /> En vivo · {nf.format(resultado.totalCatalogo)} abiertas en Mercado Público
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {filtros.q
              ? `${nf.format(resultado.total)} resultado${resultado.total === 1 ? "" : "s"} para “${filtros.q}”`
              : `${nf.format(resultado.total)} oportunidades abiertas${
                  filtros.soloRubros ? " de tus rubros" : ""
                }, ordenadas por ${
                  {
                    relevancia: "afinidad con tu empresa",
                    cierre: "cierre más próximo",
                    monto: "mayor monto",
                    recientes: "publicación más reciente",
                  }[filtros.orden] ?? "relevancia"
                }.`}
          </p>
        </div>
      </div>

      {/* Buscador */}
      {puedeBuscar ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            aplicar({ q: term.trim(), p: "" });
          }}
          className="card mb-4 flex items-center gap-2 p-2"
        >
          <Search size={18} className="ml-2 shrink-0 text-muted" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Busca por producto, servicio, organismo o código (ej. luminarias, aseo, 1057-…)"
            className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-ink placeholder:text-muted focus:outline-none"
          />
          {filtros.q && (
            <button
              type="button"
              onClick={() => {
                setTerm("");
                aplicar({ q: "", p: "" });
              }}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"
              aria-label="Limpiar búsqueda"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg btn-ink px-4 py-2 text-sm font-semibold"
          >
            {pending ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            Buscar
          </button>
        </form>
      ) : (
        <PlanLock className="mb-4" texto="La búsqueda por palabra clave está disponible en planes superiores." />
      )}

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {tiposPermitidos.length > 1 && (
          <>
            <button className={chip(!filtros.tipo)} onClick={() => aplicar({ tipo: "", p: "" })}>
              Todas
            </button>
            {tiposPermitidos.map((t) => (
              <button key={t} className={chip(filtros.tipo === t)} onClick={() => aplicar({ tipo: t, p: "" })}>
                {t === "Licitación" ? "Licitaciones" : "Compras Ágiles"}
              </button>
            ))}
            <span className="mx-1 h-5 w-px bg-line" />
          </>
        )}
        {rubros.length > 0 && (
          <button
            className={chip(filtros.soloRubros)}
            onClick={() => aplicar({ soloRubros: filtros.soloRubros ? "" : "1", p: "" })}
          >
            <Sparkles size={12} className="-mt-0.5 mr-1 inline" />
            Solo mis rubros
          </button>
        )}
        <select
          className={select}
          value={filtros.cierre}
          onChange={(e) => aplicar({ cierre: e.target.value, p: "" })}
          aria-label="Plazo de cierre"
        >
          <option value="">Cualquier cierre</option>
          <option value="hoy">Cierran hoy</option>
          <option value="semana">Cierran en 7 días</option>
          <option value="mes">Cierran en 30 días</option>
        </select>
        {puedeRegion && (
          <select
            className={select}
            value={filtros.region}
            onChange={(e) => aplicar({ region: e.target.value, p: "" })}
            aria-label="Región"
          >
            <option value="">Todas las regiones</option>
            {resultado.regiones.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}
        <select
          className={select}
          value={filtros.monto}
          onChange={(e) => aplicar({ monto: e.target.value, p: "" })}
          aria-label="Monto mínimo"
        >
          <option value="">Cualquier monto</option>
          <option value="1000000">Desde $1 MM</option>
          <option value="10000000">Desde $10 MM</option>
          <option value="50000000">Desde $50 MM</option>
          <option value="200000000">Desde $200 MM</option>
        </select>
        <select
          className={select}
          value={filtros.orden}
          onChange={(e) => aplicar({ orden: e.target.value, p: "" })}
          aria-label="Ordenar por"
        >
          <option value="relevancia">Más relevantes</option>
          <option value="cierre">Cierran antes</option>
          <option value="monto">Mayor monto</option>
          <option value="recientes">Más recientes</option>
        </select>
        {hayFiltros && (
          <button
            onClick={() => {
              setTerm("");
              startTransition(() => router.push(pathname, { scroll: false }));
            }}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-semibold text-muted hover:text-ink"
          >
            <RotateCcw size={12} /> Limpiar
          </button>
        )}
        {pending && <Loader2 size={16} className="ml-1 animate-spin text-brand-600" />}
      </div>

      {/* Resultados */}
      <div className={`transition-opacity ${pending ? "opacity-60" : ""}`}>
        {resultado.items.length === 0 ? (
          <EmptyState icon={SearchX} title="No hay oportunidades con estos filtros">
            {resultado.totalCatalogo === 0
              ? "Estamos sincronizando el catálogo de Mercado Público. Vuelve en unos minutos."
              : "Prueba quitando filtros o buscando otra palabra."}
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {resultado.items.map((l) => (
              <article
                key={l.codigo}
                onClick={() => setSelected(l)}
                className="card card-hover min-w-0 cursor-pointer p-4 sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <TipoBadge tipo={l.tipo} tipoLic={l.tipoLic} />
                      <span className="font-mono text-[11px] text-muted">{l.codigo}</span>
                    </div>
                    <h3 className="mt-2 line-clamp-2 font-semibold leading-snug text-ink">{l.nombre}</h3>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <span className="inline-flex min-w-0 max-w-full items-center gap-1">
                        <Building2 size={13} className="shrink-0" />
                        <span className="truncate">{l.organismo}</span>
                      </span>
                      {l.region !== "—" && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={13} /> {l.region}
                        </span>
                      )}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <CierreBadge cierre={l.cierre} cierreHora={l.cierreHora} />
                      {(l.rubrosMatch ?? []).slice(0, 2).map((r) => (
                        <span
                          key={r}
                          className="rounded-full bg-accent-500/10 px-2.5 py-1 text-xs font-medium text-accent-600"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-row items-center justify-between gap-2 border-t border-line pt-3 sm:flex-col sm:items-end sm:border-0 sm:pt-0 sm:text-right">
                    <ScoreBadge score={l.score} />
                    <p className="num text-lg font-bold tracking-tight text-ink">
                      {l.monto > 0 ? fmtCLPCorto(l.monto) : <span className="text-sm font-medium text-muted">Monto no publicado</span>}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSave(l);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        saved[l.codigo]
                          ? "bg-brand-600 text-white"
                          : "bg-surface text-ink/70 hover:bg-brand-600/10 hover:text-brand-700"
                      }`}
                      aria-pressed={!!saved[l.codigo]}
                    >
                      <Bookmark size={13} fill={saved[l.codigo] ? "currentColor" : "none"} />
                      {saved[l.codigo] ? "Guardada" : "Guardar"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Paginación */}
        {resultado.paginas > 1 && (
          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="num text-xs text-muted">
              Página {resultado.pagina} de {resultado.paginas}
            </p>
            <div className="flex gap-2">
              <button
                disabled={resultado.pagina <= 1}
                onClick={() => aplicar({ p: String(resultado.pagina - 1) })}
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-ink disabled:opacity-40"
              >
                <ChevronLeft size={15} /> Anterior
              </button>
              <button
                disabled={resultado.pagina >= resultado.paginas}
                onClick={() => aplicar({ p: String(resultado.pagina + 1) })}
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-ink disabled:opacity-40"
              >
                Siguiente <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      <LicitacionModal
        licitacion={selected}
        saved={selected ? !!saved[selected.codigo] : false}
        onToggleSaved={toggleSave}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
