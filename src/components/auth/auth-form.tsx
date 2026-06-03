"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  loginAction,
  registerAction,
  demoLoginAction,
  type AuthState,
} from "@/lib/actions/auth";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
    >
      {pending && <Loader2 size={16} className="animate-spin" />}
      {label}
    </button>
  );
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction] = useActionState<AuthState, FormData>(
    action,
    undefined
  );

  return (
    <div className="w-full">
      <form action={formAction} className="space-y-4">
        {mode === "register" && (
          <Field
            label="Nombre completo"
            name="nombre"
            type="text"
            placeholder="Camila Rojas"
            autoComplete="name"
          />
        )}
        <Field
          label="Correo electrónico"
          name="email"
          type="email"
          placeholder="tu@empresa.cl"
          autoComplete="email"
        />
        <Field
          label="Contraseña"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />

        {state?.error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
            <AlertCircle size={16} className="shrink-0" />
            {state.error}
          </div>
        )}

        <SubmitButton
          label={mode === "login" ? "Ingresar" : "Crear cuenta"}
        />
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />o<span className="h-px flex-1 bg-line" />
      </div>

      <form action={demoLoginAction}>
        <button
          type="submit"
          className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface"
        >
          Entrar con cuenta demo
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {mode === "login" ? (
          <>
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="font-semibold text-brand-600 hover:text-brand-700">
              Regístrate
            </Link>
          </>
        ) : (
          <>
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
              Inicia sesión
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  type,
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  type: string;
  placeholder: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand-400 focus:bg-card focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}
