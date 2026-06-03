import "server-only";
import crypto from "node:crypto";
import { SITE } from "@/lib/site";

// Integración con Flow.cl (pasarela de pagos chilena).
// Sandbox: https://sandbox.flow.cl/api  ·  Producción: https://www.flow.cl/api
const API = process.env.FLOW_API_URL || "https://sandbox.flow.cl/api";
const KEY = process.env.FLOW_API_KEY || "";
const SECRET = process.env.FLOW_SECRET_KEY || "";
// URL pública del sitio para los callbacks (debe ser accesible por Flow).
const BASE = process.env.APP_URL || SITE.url;

export const flowConfigured = () => Boolean(KEY && SECRET);

// Firma Flow: concatena los parámetros ordenados por clave (clave+valor, sin
// separadores) y aplica HMAC-SHA256 con la secretKey.
function sign(params: Record<string, string>): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => k + params[k])
    .join("");
  return crypto.createHmac("sha256", SECRET).update(toSign).digest("hex");
}

export async function flowCreatePayment(input: {
  commerceOrder: string;
  subject: string;
  amount: number;
  email: string;
}): Promise<{ redirectUrl: string } | { error: string }> {
  if (!flowConfigured()) return { error: "Pagos no configurados (faltan claves de Flow)." };
  try {
    const params: Record<string, string> = {
      apiKey: KEY,
      commerceOrder: input.commerceOrder,
      subject: input.subject,
      currency: "CLP",
      amount: String(input.amount),
      email: input.email,
      urlConfirmation: `${BASE}/api/flow/confirmar`,
      urlReturn: `${BASE}/api/flow/retorno`,
    };
    params.s = sign(params);
    const res = await fetch(`${API}/payment/create`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.url || !data?.token) {
      return { error: data?.message || `Flow respondió ${res.status}.` };
    }
    return { redirectUrl: `${data.url}?token=${data.token}` };
  } catch {
    return { error: "No se pudo contactar a Flow." };
  }
}

export interface FlowStatus {
  status: number; // 1 pendiente · 2 pagada · 3 rechazada · 4 anulada
  commerceOrder: string;
  amount: number;
}

export async function flowGetStatus(token: string): Promise<FlowStatus | null> {
  if (!flowConfigured()) return null;
  try {
    const params: Record<string, string> = { apiKey: KEY, token };
    params.s = sign(params);
    const res = await fetch(`${API}/payment/getStatus?${new URLSearchParams(params)}`);
    if (!res.ok) return null;
    const d = await res.json();
    return {
      status: Number(d.status),
      commerceOrder: String(d.commerceOrder ?? ""),
      amount: Number(d.amount ?? 0),
    };
  } catch {
    return null;
  }
}
