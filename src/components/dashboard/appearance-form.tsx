"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, Moon, Sun } from "lucide-react";
import { updateAppearanceAction, type FormState } from "@/lib/actions/profile";
import { ACCENTS } from "@/lib/accents";

function Save() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending && <Loader2 size={15} className="animate-spin" />}
      Guardar apariencia
    </button>
  );
}

export function AppearanceForm({
  appName: appNameInit,
  accent: accentInit,
  theme: themeInit,
}: {
  appName: string;
  accent: string;
  theme: "light" | "dark";
}) {
  const [state, action] = useActionState<FormState, FormData>(
    updateAppearanceAction,
    undefined
  );
  const [accent, setAccent] = useState(accentInit);
  const [theme, setTheme] = useState<"light" | "dark">(themeInit);
  const [appName, setAppName] = useState(appNameInit);

  const applyAccent = (key: string) => {
    setAccent(key);
    const a = ACCENTS[key];
    if (a) {
      document.documentElement.style.setProperty("--brand-600", a.c600);
      document.documentElement.style.setProperty("--brand-700", a.c700);
    }
  };

  const applyTheme = (t: "light" | "dark") => {
    setTheme(t);
    document.documentElement.classList.toggle("dark", t === "dark");
  };

  return (
    <form action={action} className="space-y-5 rounded-2xl border border-line bg-card p-5">
      <div>
        <h2 className="font-semibold text-ink">Apariencia y marca</h2>
        <p className="text-sm text-muted">
          Personaliza el nombre, el color y el tema de la plataforma.
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-ink">Nombre de la plataforma</span>
        <input
          name="appName"
          value={appName}
          onChange={(e) => setAppName(e.target.value)}
          className="mt-1.5 w-full max-w-xs rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-400 focus:bg-card focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </label>

      <div>
        <span className="text-sm font-medium text-ink">Color de acento</span>
        <input type="hidden" name="accent" value={accent} />
        <div className="mt-2 flex flex-wrap gap-2.5">
          {Object.entries(ACCENTS).map(([key, a]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyAccent(key)}
              className={`h-9 w-9 rounded-full ring-offset-2 ring-offset-card transition-all ${
                accent === key ? "ring-2 ring-brand-600" : ""
              }`}
              style={{ background: a.c600 }}
              aria-label={a.label}
              title={a.label}
            />
          ))}
        </div>
      </div>

      <div>
        <span className="text-sm font-medium text-ink">Tema</span>
        <input type="hidden" name="theme" value={theme} />
        <div className="mt-2 inline-flex rounded-lg border border-line p-1">
          <button
            type="button"
            onClick={() => applyTheme("light")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
              theme === "light" ? "bg-brand-600 text-white" : "text-muted"
            }`}
          >
            <Sun size={15} /> Claro
          </button>
          <button
            type="button"
            onClick={() => applyTheme("dark")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
              theme === "dark" ? "bg-brand-600 text-white" : "text-muted"
            }`}
          >
            <Moon size={15} /> Oscuro
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Save />
        {state?.ok && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-600">
            <CheckCircle2 size={16} /> Guardado
          </span>
        )}
      </div>
    </form>
  );
}
