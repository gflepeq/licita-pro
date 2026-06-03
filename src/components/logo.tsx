import Link from "next/link";

export function Logo({
  className = "",
  dark = false,
  name = "Licitapro",
}: {
  className?: string;
  dark?: boolean;
  name?: string;
}) {
  const head = name.slice(0, Math.max(1, name.length - 3));
  const tail = name.length > 3 ? name.slice(-3) : "";
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-600/30">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
          <path d="m8.5 11 2 2 3.5-3.8" />
        </svg>
      </span>
      <span
        className={`text-lg font-bold tracking-tight ${
          dark ? "text-white" : "text-ink"
        }`}
      >
        {head}
        <span className="text-brand-600">{tail}</span>
      </span>
    </Link>
  );
}
