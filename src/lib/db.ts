import "server-only";
import type { Client, InValue } from "@libsql/client";

// Conexión libSQL.
// - Producción (Turso): cliente WEB (HTTP puro, sin binarios nativos) → ideal serverless.
// - Local (sin Turso): cliente Node sobre archivo SQLite bajo DATA_DIR o ./data.
async function createDbClient(): Promise<Client> {
  if (process.env.TURSO_DATABASE_URL) {
    const { createClient } = await import("@libsql/client/web");
    return createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  const { createClient } = await import("@libsql/client");
  const { existsSync, mkdirSync } = await import("node:fs");
  const path = await import("node:path");
  const dir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return createClient({ url: `file:${path.join(dir, "licitapro.db")}` });
}

const g = globalThis as unknown as {
  __libsql?: Promise<Client>;
  __libsqlReady?: Promise<Client>;
};

function getClient(): Promise<Client> {
  if (!g.__libsql) g.__libsql = createDbClient();
  return g.__libsql;
}

const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nombre TEXT NOT NULL,
    empresa TEXT NOT NULL DEFAULT '',
    rut TEXT NOT NULL DEFAULT '',
    plan TEXT NOT NULL DEFAULT 'Trial',
    onboarded INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    rubros TEXT NOT NULL DEFAULT '[]',
    regiones TEXT NOT NULL DEFAULT '[]',
    alert_correo INTEGER NOT NULL DEFAULT 1,
    alert_whatsapp INTEGER NOT NULL DEFAULT 1,
    alert_resumen INTEGER NOT NULL DEFAULT 1,
    umbral INTEGER NOT NULL DEFAULT 75,
    theme TEXT NOT NULL DEFAULT 'light',
    accent TEXT NOT NULL DEFAULT 'blue',
    app_name TEXT NOT NULL DEFAULT 'Licitapro'
  )`,
  `CREATE TABLE IF NOT EXISTS saved (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, codigo)
  )`,
];

// Crea el cliente y ejecuta las migraciones una sola vez por proceso.
function ready(): Promise<Client> {
  if (!g.__libsqlReady) {
    g.__libsqlReady = (async () => {
      const c = await getClient();
      for (const stmt of SCHEMA) await c.execute(stmt);
      return c;
    })();
  }
  return g.__libsqlReady;
}

async function run(sql: string, args: InValue[] = []) {
  const c = await ready();
  return c.execute({ sql, args });
}

// ---------- Tipos ----------
export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  nombre: string;
  empresa: string;
  rut: string;
  plan: string;
  onboarded: number;
  created_at: string;
}

export interface UserProfile {
  id: number;
  email: string;
  nombre: string;
  empresa: string;
  rut: string;
  plan: string;
  onboarded: boolean;
  iniciales: string;
  rubros: string[];
  regiones: string[];
  alertCorreo: boolean;
  alertWhatsapp: boolean;
  alertResumen: boolean;
  umbral: number;
  theme: "light" | "dark";
  accent: string;
  appName: string;
}

type Row = Record<string, unknown>;
const s = (v: unknown) => String(v ?? "");
const n = (v: unknown) => Number(v ?? 0);

// ---------- Usuarios ----------
export async function getUserByEmail(email: string): Promise<UserRow | undefined> {
  const r = await run("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);
  return r.rows[0] as unknown as UserRow | undefined;
}

export async function getUserById(id: number): Promise<UserRow | undefined> {
  const r = await run("SELECT * FROM users WHERE id = ?", [id]);
  return r.rows[0] as unknown as UserRow | undefined;
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  nombre: string;
  empresa?: string;
}): Promise<number> {
  const r = await run(
    "INSERT INTO users (email, password_hash, nombre, empresa) VALUES (?, ?, ?, ?)",
    [input.email.toLowerCase(), input.passwordHash, input.nombre, input.empresa ?? ""]
  );
  const userId = Number(r.lastInsertRowid);
  await run("INSERT INTO settings (user_id) VALUES (?)", [userId]);
  return userId;
}

// ---------- Perfil ----------
export async function getProfile(userId: number): Promise<UserProfile | null> {
  const u = await getUserById(userId);
  if (!u) return null;

  let sr = (await run("SELECT * FROM settings WHERE user_id = ?", [userId]))
    .rows[0] as Row | undefined;
  if (!sr) {
    await run("INSERT INTO settings (user_id) VALUES (?)", [userId]);
    sr = (await run("SELECT * FROM settings WHERE user_id = ?", [userId]))
      .rows[0] as Row;
  }

  const iniciales = s(u.nombre)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return {
    id: n(u.id),
    email: s(u.email),
    nombre: s(u.nombre),
    empresa: s(u.empresa),
    rut: s(u.rut),
    plan: s(u.plan),
    onboarded: n(u.onboarded) === 1,
    iniciales: iniciales || "U",
    rubros: JSON.parse(s(sr.rubros) || "[]") as string[],
    regiones: JSON.parse(s(sr.regiones) || "[]") as string[],
    alertCorreo: n(sr.alert_correo) === 1,
    alertWhatsapp: n(sr.alert_whatsapp) === 1,
    alertResumen: n(sr.alert_resumen) === 1,
    umbral: n(sr.umbral),
    theme: s(sr.theme) === "dark" ? "dark" : "light",
    accent: s(sr.accent) || "blue",
    appName: s(sr.app_name) || "Licitapro",
  };
}

export async function completeOnboarding(
  userId: number,
  data: { empresa: string; rut: string; rubros: string[]; regiones: string[] }
) {
  await run("UPDATE users SET empresa = ?, rut = ?, onboarded = 1 WHERE id = ?", [
    data.empresa,
    data.rut,
    userId,
  ]);
  await run("UPDATE settings SET rubros = ?, regiones = ? WHERE user_id = ?", [
    JSON.stringify(data.rubros),
    JSON.stringify(data.regiones),
    userId,
  ]);
}

export async function updateProfile(
  userId: number,
  data: { nombre: string; empresa: string; rut: string; rubros: string[]; regiones: string[] }
) {
  await run("UPDATE users SET nombre = ?, empresa = ?, rut = ? WHERE id = ?", [
    data.nombre,
    data.empresa,
    data.rut,
    userId,
  ]);
  await run("UPDATE settings SET rubros = ?, regiones = ? WHERE user_id = ?", [
    JSON.stringify(data.rubros),
    JSON.stringify(data.regiones),
    userId,
  ]);
}

export async function updateAlerts(
  userId: number,
  data: { alertCorreo: boolean; alertWhatsapp: boolean; alertResumen: boolean; umbral: number }
) {
  await run(
    "UPDATE settings SET alert_correo = ?, alert_whatsapp = ?, alert_resumen = ?, umbral = ? WHERE user_id = ?",
    [
      data.alertCorreo ? 1 : 0,
      data.alertWhatsapp ? 1 : 0,
      data.alertResumen ? 1 : 0,
      data.umbral,
      userId,
    ]
  );
}

export async function updateAppearance(
  userId: number,
  data: { theme: "light" | "dark"; accent: string; appName: string }
) {
  await run("UPDATE settings SET theme = ?, accent = ?, app_name = ? WHERE user_id = ?", [
    data.theme,
    data.accent,
    data.appName,
    userId,
  ]);
}

// ---------- Oportunidades guardadas ----------
export async function listSavedCodes(userId: number): Promise<string[]> {
  const r = await run("SELECT codigo FROM saved WHERE user_id = ?", [userId]);
  return r.rows.map((row) => s((row as Row).codigo));
}

export async function listSaved(userId: number): Promise<unknown[]> {
  const r = await run(
    "SELECT data FROM saved WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return r.rows.map((row) => JSON.parse(s((row as Row).data)));
}

export async function toggleSaved(
  userId: number,
  codigo: string,
  data: unknown
): Promise<boolean> {
  const exists = await run(
    "SELECT 1 FROM saved WHERE user_id = ? AND codigo = ?",
    [userId, codigo]
  );
  if (exists.rows.length > 0) {
    await run("DELETE FROM saved WHERE user_id = ? AND codigo = ?", [userId, codigo]);
    return false;
  }
  await run("INSERT INTO saved (user_id, codigo, data) VALUES (?, ?, ?)", [
    userId,
    codigo,
    JSON.stringify(data),
  ]);
  return true;
}
