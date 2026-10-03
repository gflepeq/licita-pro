import Link from "next/link";

// Isotipo de LiciApp: lupa cuyo aro es una cinta continua que remata en un check,
// con el degradado de la familia StayFlow (azul → violeta → magenta → naranja).
export function LogoMark({ size = 36, id = "lici" }: { size?: number; id?: string }) {
  const g = `${id}-flow`;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" role="img" aria-label="LiciApp">
      <defs>
        <linearGradient id={g} x1="16" y1="104" x2="104" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2B60EC" />
          <stop offset="0.34" stopColor="#773CEC" />
          <stop offset="0.66" stopColor="#B53DA9" />
          <stop offset="1" stopColor="#F96B23" />
        </linearGradient>
      </defs>
      {/* Aro de la lupa: arco abierto que nace del mango */}
      <path
        d="M66 77.7A32 32 0 1 1 80.9 58.3"
        stroke={`url(#${g})`}
        strokeWidth="13"
        strokeLinecap="round"
      />
      {/* Mango */}
      <path d="M74 74L100 100" stroke={`url(#${g})`} strokeWidth="14" strokeLinecap="round" />
      {/* Check: la oportunidad encontrada */}
      <path
        d="M36 51L46.5 61.5L66 41"
        stroke={`url(#${g})`}
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  className = "",
  dark = false,
  name = "LiciApp",
  size = 34,
}: {
  className?: string;
  dark?: boolean;
  name?: string;
  size?: number;
}) {
  // Wordmark estilo StayFlow: primera parte liviana, "App" en negrita, en mayúsculas.
  const corte = name.toLowerCase().endsWith("app") ? name.length - 3 : Math.ceil(name.length / 2);
  const head = name.slice(0, corte);
  const tail = name.slice(corte);
  return (
    <Link href="/" className={`flex items-center gap-2.5 ${className}`} aria-label={name}>
      <LogoMark size={size} />
      <span
        className={`text-[17px] uppercase tracking-[0.025em] ${dark ? "text-white" : "text-ink"}`}
      >
        <span className="font-light">{head}</span>
        <span className="font-bold">{tail}</span>
      </span>
    </Link>
  );
}
