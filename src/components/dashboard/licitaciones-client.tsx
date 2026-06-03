"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  FileSearch,
  Loader2,
  Radio,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { EstadoBadge, ScoreBadge } from "@/components/dashboard/ui";
import { LicitacionModal } from "@/components/dashboard/licitacion-modal";
import { toggleSavedAction } from "@/lib/actions/saved";
import { diasRestantes, fmtCLP, fmtFecha, type Licitacion } from "@/lib/data";

type Orden = "relevancia" | "monto" | "cierre" | "recientes";

// Bucket de fecha de cierre relativo al mes actual.
function cierreBucket(iso: string): "este" | "prox" | "lejos" | "pasado" | "none" {
  if (!iso) return "none";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return "none";
  const hoy = new Date();
  const startToday = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (d < startToday) return "pasado";
  const months = (d.getFullYear() - hoy.getFullYear()) * 12 + (d.getMonth() - hoy.getMonth());
  if (months <= 0) return "este";
  if (months === 1) return "prox";
  return "lejos";
}

export function LicitacionesClient({
  data,
  savedCodes,
  source,
  query,
}: {
  data: Licitacion[];
  savedCodes: string[];
  source: "live" | "demo";
  query: string;
}) {
  const router = useRouter();
  const [term, setTerm] = useState(query);
  const [selected, setSelected] = useState<Licitacion | null>(null);
  const [pending, startTransition] = useTransition();
  const [showFilters, setShowFilters] = useState(false);
  const [saved, setSaved] = useState<Record<string, boolean>>(
    Object.fromEntries(savedCodes.map((c) => [c, true]))
  );

  // ----- Filtros -----
  const [orden, setOrden] = useState<Orden>("relevancia");
  const [mecLic, setMecLic] = useState(false);
  const [mecAgil, setMecAgil] = useState(false);
  const [region, setRegion] = useState("Todas");
  const [cEste, setCEste] = useState(false);
  const [cProx, setCProx] = useState(false);
  const [cLejos, setCLejos] = useState(false);
  const [pubSi, setPubSi] = useState(false);
  const [pubNo, setPubNo] = useState(false);

  const resetFiltros = () => {
    setOrden("relevancia");
    setMecLic(false);
    setMecAgil(false);
    setRegion("Todas");
    setCEste(false);
    setCProx(false);
    setCLejos(false);
    setPubSi(false);
    setPubNo(false);
  };

  const buscar = (value: string) => {
    const v = value.trim();
    startTransition(() => {
      router.push(
        v ? `/dashboard/licitaciones?q=${encodeURIComponent(v)}` : "/dashboard/licitaciones"
      );
    });
  };

  const toggle = (l: Licitacion) => {
    setSaved((s) => ({ ...s, [l.codigo]: !s[l.codigo] }));
    startTransition(() => {
      toggleSavedAction(l);
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
    }),
    [data]
  );

  const rows = useMemo(() => {
    const mecActivo = mecLic || mecAgil;
    const cierreActivo = cEste || cProx || cLejos;
    const pubActivo = pubSi || pubNo;

    const r = data.filter((l) => {
      if (mecActivo) {
        const ok = (mecLic && l.tipo === "Licitación") || (mecAgil && l.tipo === "Compra Ágil");
        if (!ok) return false;
      }
      if (region !== "Todas" && l.region !== region) return false;
      if (cierreActivo) {
        const b = cierreBucket(l.cierre);
        const ok = (cEste && b === "este") || (cProx && b === "prox") || (cLejos && b === "lejos");
        if (!ok) return false;
      }
      if (pubActivo) {
        const ok = (pubSi && l.monto > 0) || (pubNo && l.monto <= 0);
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
    return [...r].sort(sorters[orden]);
  }, [data, orden, mecLic, mecAgil, region, cEste, cProx, cLejos, pubSi, pubNo]);

  const filtrosActivos =
    mecLic || mecAgil || region !== "Todas" || cEste || cProx || cLejos || pubSi || pubNo || orden !== "relevancia";

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Licitaciones</h1>
        {source === "live" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500/10 px-2.5 py-1 text-xs font-semibold text-accent-600">
            <Radio size={12} /> Datos en vivo · Mercado Público
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600">
            Datos de demostración
          </span>
        )}
      </div>
      <p className="mb-5 text-sm text-muted">
        {query
          ? `${rows.length} resultado${rows.length === 1 ? "" : "s"} para “${query}”`
          : `Existen ${rows.length} oportunidades para tu perfil.`}
      </p>

      {/* Buscador */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          buscar(term);
        }}
        className="mb-5 flex gap-2"
      >
        <div className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Palabra clave o número del proceso (ej. web, aseo, 1057-…)"
            className="w-full rounded-lg border border-line bg-card py-2.5 pl-10 pr-9 text-sm text-ink placeholder:text-muted focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setTerm("");
                buscar("");
              }}
              className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-muted hover:bg-line hover:text-ink"
              aria-label="Limpiar búsqueda"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Buscar
        </button>
      </form>

      {/* Toggle filtros (móvil) */}
      <button
        onClick={() => setShowFilters((v) => !v)}
        className="mb-4 inline-flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2 text-sm font-semibold text-ink lg:hidden"
      >
        <SlidersHorizontal size={16} /> Filtros
      </button>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Sidebar de filtros */}
        <aside
          className={`${showFilters ? "block" : "hidden"} h-fit rounded-2xl border border-line bg-card p-5 lg:block`}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-ink">Filtrar</h2>
            {filtrosActivos && (
              <button
                onClick={resetFiltros}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                <RotateCcw size={13} /> Restablecer
              </button>
            )}
          </div>

          {/* Ordenar por */}
          <Group title="Ordenar por">
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value as Orden)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="relevancia">Más relevantes</option>
              <option value="recientes">Más recientes</option>
              <option value="cierre">Cierre más próximo</option>
              <option value="monto">Mayor presupuesto</option>
            </select>
          </Group>

          {/* Mecanismos de compra */}
          <Group title="Mecanismos de compra">
            <Check label="Licitaciones" count={cuenta.lic} checked={mecLic} onChange={setMecLic} />
            <Check label="Compra Ágil" count={cuenta.agil} checked={mecAgil} onChange={setMecAgil} />
          </Group>

          {/* Regiones */}
          {regiones.length > 1 && (
            <Group title="Regiones">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                {regiones.map((r) => (
                  <option key={r} value={r}>
                    {r === "Todas" ? "Todas las regiones" : r}
                  </option>
                ))}
              </select>
            </Group>
          )}

          {/* Fecha de cierre */}
          <Group title="Fecha de cierre">
            <Check label="Este mes" checked={cEste} onChange={setCEste} />
            <Check label="Próximo mes" checked={cProx} onChange={setCProx} />
            <Check label="2 meses o más" checked={cLejos} onChange={setCLejos} />
          </Group>

          {/* Presupuesto */}
          <Group title="Presupuesto" last>
            <Check label="Publicado" count={cuenta.pubSi} checked={pubSi} onChange={setPubSi} />
            <Check label="No publicado" count={cuenta.pubNo} checked={pubNo} onChange={setPubNo} />
          </Group>
        </aside>

        {/* Resultados */}
        <div className="min-w-0">
          <div className="space-y-3">
            {rows.map((l) => {
              const dias = l.cierre ? diasRestantes(l.cierre) : null;
              return (
                <div
                  key={l.id}
                  onClick={() => setSelected(l)}
                  className="cursor-pointer rounded-2xl border border-line bg-card p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ScoreBadge score={l.score} />
                      <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-muted">
                        {l.tipo}
                      </span>
                      <EstadoBadge estado={l.estado} />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(l);
                      }}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg hover:bg-surface"
                      aria-label="Guardar"
                    >
                      <Bookmark
                        size={17}
                        className={
                          saved[l.codigo] ? "fill-brand-600 text-brand-600" : "text-slate-300"
                        }
                      />
                    </button>
                  </div>

                  <p className="mt-2 font-medium text-ink">{l.nombre}</p>
                  <p className="text-xs text-muted">
                    {l.organismo} · {l.codigo}
                    {l.region !== "—" ? ` · ${l.region}` : ""}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">
                      {l.monto > 0 ? fmtCLP(l.monto) : "Presupuesto no publicado"}
                    </span>
                    {l.cierre && (
                      <span
                        className={`text-xs font-medium ${
                          l.estado === "Publicada" && dias !== null && dias <= 3
                            ? "text-red-600"
                            : "text-muted"
                        }`}
                      >
                        {l.estado === "Publicada" && dias !== null && dias >= 0
                          ? `Cierra ${fmtFecha(l.cierre)} · ${dias}d`
                          : fmtFecha(l.cierre)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {rows.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line bg-card py-16 text-center">
              <p className="text-sm text-muted">
                {query
                  ? `No encontramos resultados para “${query}”.`
                  : "No hay oportunidades que coincidan con los filtros."}
              </p>
              {filtrosActivos && (
                <button
                  onClick={resetFiltros}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
                >
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

function Group({
  title,
  children,
  last,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`${last ? "" : "mb-5 border-b border-line pb-5"}`}>
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
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
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`grid h-4.5 w-4.5 shrink-0 place-items-center rounded border transition-colors ${
          checked ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-surface"
        }`}
        style={{ height: 18, width: 18 }}
      >
        {checked && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </button>
      <span className="flex-1" onClick={() => onChange(!checked)}>
        {label}
      </span>
      {typeof count === "number" && <span className="text-xs text-muted">({count})</span>}
    </label>
  );
}
