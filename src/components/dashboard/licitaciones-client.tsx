"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  Building2,
  Clock,
  Info,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
  SearchX,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { EstadoBadge, PageHeader, ScoreBadge, ScoreRing, SourceBadge } from "@/components/dashboard/ui";
import { LicitacionModal } from "@/components/dashboard/licitacion-modal";
import { PlanLock } from "@/components/dashboard/plan-lock";
import { useToast } from "@/components/toast";
import { toggleSavedAction } from "@/lib/actions/saved";
import { diasRestantes, fmtMonto, textoCierre, type Licitacion } from "@/lib/data";

type Orden = "relevancia" | "monto" | "cierre" | "recientes";
type Cierre = "3d" | "semana" | "mes" | "lejos";

const PAGE = 30;

function cierreBucket(iso: string): Cierre | "pasado" | "none" {
  if (!iso) return "none";
  const d = diasRestantes(iso);
  if (d < 0) return "pasado";
  if (d <= 3) return "3d";
  if (d <= 7) return "semana";
  if (d <= 31) return "mes";
  return "lejos";
}

interface Filtros {
  soloRubros: boolean;
  soloRegiones: boolean;
  orden: Orden;
  tipos: string[];
  region: string;
  cierre: Cierre[];
  presupuesto: ("si" | "no")[];
  soloAbiertas: boolean;
}

const FILTROS_INICIALES: Filtros = {
  soloRubros: false,
  soloRegiones: false,
  orden: "relevancia",
  tipos: [],
  region: "Todas",
  cierre: [],
  presupuesto: [],
  soloAbiertas: true,
};

const STORAGE_KEY = "liciapp:filtros:v1";

export function LicitacionesClient({
  data,
  savedCodes,
  source,
  total,
  enriquecidas,
  fetchedAt,
  note,
  misRegiones = [],
  query,
  puedeRegion = true,
  puedeBuscar = true,
  tiposPermitidos = ["Licitación", "Compra Ágil"],
}: {
  data: Licitacion[];
  savedCodes: string[];
  source: "live" | "demo";
  total: number;
  enriquecidas: number;
  fetchedAt: string;
  note?: string;
  misRegiones?: string[];
  query: string;
  puedeRegion?: boolean;
  puedeBuscar?: boolean;
  tiposPermitidos?: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [term, setTerm] = useState(query);
  const [selected, setSelected] = useState<Licitacion | null>(null);
  const [pending, startTransition] = useTransition();
  const [showFilters, setShowFilters] = useState(false);
  const [visible, setVisible] = useState(PAGE);
  const [saved, setSaved] = useState<Record<string, boolean>>(
    Object.fromEntries(savedCodes.map((c) => [c, true]))
  );
  const [f, setF] = useState<Filtros>(FILTROS_INICIALES);

  // Recordar filtros entre visitas (por navegador).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratar desde localStorage
      if (raw) setF({ ...FILTROS_INICIALES, ...JSON.parse(raw) });
    } catch {}
  }, []);
  const update = (patch: Partial<Filtros>) => {
    setVisible(PAGE);
    setF((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  const toggleIn = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const buscar = (value: string) => {
    const v = value.trim();
    startTransition(() => {
      router.push(v ? `/dashboard/licitaciones?q=${encodeURIComponent(v)}` : "/dashboard/licitaciones");
    });
  };

  const toggle = (l: Licitacion) => {
    const estaba = !!saved[l.codigo];
    setSaved((s) => ({ ...s, [l.codigo]: !estaba }));
    startTransition(async () => {
      const r = await toggleSavedAction(l);
      if (r.limit) {
        setSaved((s) => ({ ...s, [l.codigo]: false }));
        toast("Alcanzaste el límite de oportunidades guardadas de tu plan.", "error");
      } else {
        toast(r.saved ? "Guardada en tus oportunidades" : "Quitada de guardadas");
      }
    });
  };

  const regiones = useMemo(() => {
    const set = new Set<string>();
    data.forEach((l) => l.region && l.region !== "—" && set.add(l.region));
    return ["Todas", ...Array.from(set).sort()];
  }, [data]);

  const cuenta = useMemo(
    () => ({
      lic: data.filter((l) => l.tipo === "Licitación").length,
      agil: data.filter((l) => l.tipo === "Compra Ágil").length,
      pubSi: data.filter((l) => l.monto > 0).length,
      pubNo: data.filter((l) => l.monto <= 0).length,
      rubros: data.filter((l) => l.rubrosMatch && l.rubrosMatch.length > 0).length,
      regiones: data.filter((l) => l.enRegion).length,
    }),
    [data]
  );

  const rows = useMemo(() => {
    const r = data.filter((l) => {
      if (f.soloAbiertas && l.estado !== "Publicada") return false;
      if (f.soloRubros && !(l.rubrosMatch && l.rubrosMatch.length > 0)) return false;
      if (f.soloRegiones && !l.enRegion) return false;
      if (f.tipos.length && !f.tipos.includes(l.tipo)) return false;
      if (f.region !== "Todas" && l.region !== f.region) return false;
      if (f.cierre.length) {
        const b = cierreBucket(l.cierre);
        if (!f.cierre.includes(b as Cierre)) return false;
      }
      if (f.presupuesto.length) {
        const ok = (f.presupuesto.includes("si") && l.monto > 0) || (f.presupuesto.includes("no") && l.monto <= 0);
        if (!ok) return false;
      }
      return true;
    });
    const sorters: Record<Orden, (a: Licitacion, b: Licitacion) => number> = {
      relevancia: (a, b) => b.score - a.score,
      monto: (a, b) => b.monto - a.monto,
      cierre: (a, b) => (a.cierre || "9999").localeCompare(b.cierre || "9999"),
      recientes: (a, b) => (b.publicada || "").localeCompare(a.publicada || ""),
    };
    return [...r].sort(sorters[f.orden]);
  }, [data, f]);

  const filtrosActivos = JSON.stringify(f) !== JSON.stringify(FILTROS_INICIALES);
  const nFiltros =
    Number(f.soloRubros) +
    Number(f.soloRegiones) +
    f.tipos.length +
    Number(f.region !== "Todas") +
    f.cierre.length +
    f.presupuesto.length +
    Number(!f.soloAbiertas);

  return (
    <div>
      <PageHeader
        title={query ? `Resultados para “${query}”` : "Oportunidades"}
        badge={<SourceBadge source={source} fetchedAt={fetchedAt} />}
        subtitle={
          query
            ? `${rows.length.toLocaleString("es-CL")} coincidencia${rows.length === 1 ? "" : "s"} en licitaciones y compras ágiles.`
            : `${total.toLocaleString("es-CL")} oportunidades vigentes en Mercado Público, ordenadas según tu perfil.`
        }
      />

      {/* Buscador (según plan) */}
      {puedeBuscar ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            buscar(term);
          }}
          className="mb-5 flex gap-2"
        >
          <div className="relative flex-1">
            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Palabra clave, organismo o código del proceso (ej. luminarias, 1057-412-LR26)"
              className="input py-3 pl-11 pr-10 shadow-card"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setTerm("");
                  buscar("");
                }}
                className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-ink"
                aria-label="Limpiar búsqueda"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <button type="submit" disabled={pending} className="btn-primary px-5">
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            <span className="hidden sm:inline">Buscar</span>
          </button>
        </form>
      ) : (
        <div className="mb-5">
          <PlanLock texto="La búsqueda en todo Mercado Público está disponible en planes superiores." />
        </div>
      )}

      {note && (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-line bg-card px-4 py-3 text-xs text-muted">
          <Info size={15} className="mt-px shrink-0 text-brand-600" />
          <span>
            {note}
            {source === "live" && enriquecidas < total && !query && (
              <> Detalle completo disponible para {enriquecidas.toLocaleString("es-CL")}; el resto se completa automáticamente.</>
            )}
          </span>
        </p>
      )}

      {/* Toggle filtros (móvil) */}
      <button onClick={() => setShowFilters((v) => !v)} className="btn-secondary mb-4 lg:hidden">
        <SlidersHorizontal size={16} /> Filtros
        {nFiltros > 0 && <span className="chip bg-brand-600 text-white">{nFiltros}</span>}
      </button>

      <div className="grid gap-6 lg:grid-cols-[264px_1fr]">
        {/* Filtros */}
        <aside
          className={`${showFilters ? "block" : "hidden"} card h-fit p-5 lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto scrollbar-thin`}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-ink">
              <SlidersHorizontal size={16} className="text-brand-600" /> Filtros
            </h2>
            {filtrosActivos && (
              <button
                onClick={() => update(FILTROS_INICIALES)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                <RotateCcw size={13} /> Restablecer
              </button>
            )}
          </div>

          <Group title="Ordenar por">
            <select value={f.orden} onChange={(e) => update({ orden: e.target.value as Orden })} className="input py-2">
              <option value="relevancia">Mejor match</option>
              <option value="cierre">Cierre más próximo</option>
              <option value="recientes">Más recientes</option>
              <option value="monto">Mayor presupuesto</option>
            </select>
          </Group>

          <Group title="Mi perfil">
            <Check label="Solo mis rubros" count={cuenta.rubros} checked={f.soloRubros} onChange={(v) => update({ soloRubros: v })} />
            {misRegiones.length > 0 && (
              <Check label="Solo mis regiones" count={cuenta.regiones} checked={f.soloRegiones} onChange={(v) => update({ soloRegiones: v })} />
            )}
            <Check label="Solo abiertas" checked={f.soloAbiertas} onChange={(v) => update({ soloAbiertas: v })} />
          </Group>

          {tiposPermitidos.length > 1 && (
            <Group title="Mecanismo de compra">
              {tiposPermitidos.includes("Licitación") && (
                <Check label="Licitaciones" count={cuenta.lic} checked={f.tipos.includes("Licitación")} onChange={() => update({ tipos: toggleIn(f.tipos, "Licitación") })} />
              )}
              {tiposPermitidos.includes("Compra Ágil") && (
                <Check label="Compra Ágil" count={cuenta.agil} checked={f.tipos.includes("Compra Ágil")} onChange={() => update({ tipos: toggleIn(f.tipos, "Compra Ágil") })} />
              )}
            </Group>
          )}

          {puedeRegion && regiones.length > 1 && (
            <Group title="Región">
              <select value={f.region} onChange={(e) => update({ region: e.target.value })} className="input py-2">
                {regiones.map((r) => (
                  <option key={r} value={r}>
                    {r === "Todas" ? "Todas las regiones" : r}
                  </option>
                ))}
              </select>
            </Group>
          )}

          <Group title="Cierre">
            <Check label="En 3 días o menos" checked={f.cierre.includes("3d")} onChange={() => update({ cierre: toggleIn(f.cierre, "3d") })} />
            <Check label="Esta semana" checked={f.cierre.includes("semana")} onChange={() => update({ cierre: toggleIn(f.cierre, "semana") })} />
            <Check label="Este mes" checked={f.cierre.includes("mes")} onChange={() => update({ cierre: toggleIn(f.cierre, "mes") })} />
            <Check label="Más de un mes" checked={f.cierre.includes("lejos")} onChange={() => update({ cierre: toggleIn(f.cierre, "lejos") })} />
          </Group>

          <Group title="Presupuesto" last>
            <Check label="Publicado" count={cuenta.pubSi} checked={f.presupuesto.includes("si")} onChange={() => update({ presupuesto: toggleIn(f.presupuesto, "si") })} />
            <Check label="No publicado" count={cuenta.pubNo} checked={f.presupuesto.includes("no")} onChange={() => update({ presupuesto: toggleIn(f.presupuesto, "no") })} />
          </Group>
        </aside>

        {/* Resultados */}
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between text-xs text-muted">
            <span>
              {rows.length.toLocaleString("es-CL")} resultado{rows.length === 1 ? "" : "s"}
              {filtrosActivos ? " con filtros" : ""}
            </span>
          </div>

          <div className="space-y-3">
            {rows.slice(0, visible).map((l) => (
              <OportunidadCard
                key={l.id}
                l={l}
                saved={!!saved[l.codigo]}
                onOpen={() => setSelected(l)}
                onToggle={() => toggle(l)}
              />
            ))}
          </div>

          {rows.length > visible && (
            <div className="mt-5 text-center">
              <button onClick={() => setVisible((v) => v + PAGE)} className="btn-secondary">
                Ver más ({(rows.length - visible).toLocaleString("es-CL")} restantes)
              </button>
            </div>
          )}

          {rows.length === 0 && (
            <div className="card flex flex-col items-center px-6 py-14 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <SearchX size={22} />
              </span>
              <p className="mt-4 font-semibold text-ink">
                {query ? `Sin resultados para “${query}”` : "Nada coincide con los filtros"}
              </p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                Prueba con otra palabra clave, el código exacto del proceso o quita algunos filtros.
              </p>
              {filtrosActivos && (
                <button onClick={() => update(FILTROS_INICIALES)} className="btn-secondary mt-5">
                  <RotateCcw size={14} /> Restablecer filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <LicitacionModal
        licitacion={selected}
        saved={selected ? !!saved[selected.codigo] : false}
        onToggleSaved={toggle}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

export function OportunidadCard({
  l,
  saved,
  onOpen,
  onToggle,
}: {
  l: Licitacion;
  saved: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const dias = l.cierre ? diasRestantes(l.cierre) : null;
  const abierta = l.estado === "Publicada" && dias !== null && dias >= 0;
  const urgente = abierta && dias !== null && dias <= 3;
  return (
    <article
      onClick={onOpen}
      className="card card-hover group flex cursor-pointer gap-4 p-4 sm:p-5"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}
    >
      <div className="hidden sm:block">
        <ScoreRing score={l.score} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className="sm:hidden">
                <ScoreBadge score={l.score} />
              </span>
              <span
                className={`chip ${
                  l.tipo === "Compra Ágil"
                    ? "bg-violet-500/10 text-violet-700 dark:text-violet-300"
                    : "bg-brand-50 text-brand-700 dark:text-brand-300"
                }`}
              >
                {l.tipo}
              </span>
              {l.estado !== "Publicada" && <EstadoBadge estado={l.estado} />}
              {l.rubrosMatch?.slice(0, 2).map((r, i) => (
                <span
                  key={r}
                  className={`chip bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ${i > 0 ? "hidden sm:inline-flex" : ""}`}
                >
                  {r}
                </span>
              ))}
            </div>
            <h3 className="line-clamp-2 font-semibold leading-snug text-ink group-hover:text-brand-700 dark:group-hover:text-brand-300">
              {l.nombre}
            </h3>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-subtle hover:text-brand-600"
            aria-label={saved ? "Quitar de guardadas" : "Guardar"}
            title={saved ? "Quitar de guardadas" : "Guardar"}
          >
            <Bookmark size={17} className={saved ? "fill-brand-600 text-brand-600" : ""} />
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex min-w-0 items-center gap-1">
            <Building2 size={13} className="shrink-0" />
            <span className="truncate">{l.organismo || "Organismo por confirmar"}</span>
          </span>
          {l.region !== "—" && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} /> {l.region}
              {l.enRegion && <span className="text-emerald-600 dark:text-emerald-400">· tu región</span>}
            </span>
          )}
          <span className="hidden font-mono sm:inline">{l.codigo}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <span className={`text-sm font-semibold tabular-nums ${l.monto > 0 ? "text-ink" : "text-muted"}`}>
            {l.monto > 0 ? fmtMonto(l.monto, l.moneda) : "Presupuesto no publicado"}
          </span>
          {l.cierre && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold ${
                urgente
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : abierta
                    ? "bg-subtle text-ink"
                    : "text-muted"
              }`}
            >
              <Clock size={13} />
              {textoCierre(l.cierre, l.cierreHora)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function Group({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={last ? "" : "mb-5 border-b border-line pb-5"}>
      <p className="eyebrow mb-2.5">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Check({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-2.5 text-left text-sm text-ink"
    >
      <span
        className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border transition-colors ${
          checked ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-surface"
        }`}
      >
        {checked && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
      <span className="flex-1">{label}</span>
      {typeof count === "number" && <span className="text-xs tabular-nums text-muted">{count}</span>}
    </button>
  );
}
