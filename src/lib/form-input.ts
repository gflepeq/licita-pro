// El proxy de Elestio (mitigación CVE-2025-55182) bloquea las Server Actions
// enviadas como multipart/urlencoded. Por eso los formularios mandan sus campos
// como objeto plano (la acción viaja como text/plain) y la acción lo vuelve a
// convertir en FormData.
export type FormInput = FormData | Record<string, string | string[]>;

/** Cliente: FormData → objeto plano serializable. */
export function toPlain(fd: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string" || k.startsWith("$ACTION")) continue;
    const prev = out[k];
    out[k] = prev === undefined ? v : Array.isArray(prev) ? [...prev, v] : [prev, v];
  }
  return out;
}

/** Servidor: objeto plano (o FormData) → FormData. */
export function asFormData(input: FormInput): FormData {
  if (input instanceof FormData) return input;
  const fd = new FormData();
  for (const [k, v] of Object.entries(input ?? {})) {
    for (const item of Array.isArray(v) ? v : [v]) fd.append(k, item);
  }
  return fd;
}
