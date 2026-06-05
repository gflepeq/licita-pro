import "server-only";
import postgres from "postgres";

// Conexión a Postgres (Supabase). Define DATABASE_URL con la connection string
// del "pooler" de Supabase (puerto 6543, modo transaction) para serverless.
type Sql = ReturnType<typeof postgres>;

const g = globalThis as unknown as {
  __pg?: Sql;
  __pgReady?: Promise<Sql>;
};

function getClient(): Sql {
  if (!g.__pg) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Falta DATABASE_URL (connection string de Supabase/Postgres).");
    g.__pg = postgres(url, {
      prepare: false, // requerido por el pooler (pgBouncer) de Supabase
      ssl: "require",
      max: 5,
      idle_timeout: 20,
    });
  }
  return g.__pg;
}

const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nombre TEXT NOT NULL,
    empresa TEXT NOT NULL DEFAULT '',
    rut TEXT NOT NULL DEFAULT '',
    plan TEXT NOT NULL DEFAULT 'Trial',
    role TEXT NOT NULL DEFAULT 'user',
    onboarded INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL,
    monto INTEGER NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pagado',
    metodo TEXT NOT NULL DEFAULT 'Webpay',
    fecha TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS app_config (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    precio INTEGER NOT NULL DEFAULT 0,
    periodo TEXT NOT NULL DEFAULT '/mes',
    features TEXT NOT NULL DEFAULT '[]',
    destacado INTEGER NOT NULL DEFAULT 0,
    activo INTEGER NOT NULL DEFAULT 1,
    orden INTEGER NOT NULL DEFAULT 0
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
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, codigo)
  )`,
];

// Crea las tablas (idempotente) una sola vez por proceso.
function ready(): Promise<Sql> {
  if (!g.__pgReady) {
    g.__pgReady = (async () => {
      const c = getClient();
      for (const stmt of SCHEMA) await c.unsafe(stmt);
      await c.unsafe(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'"
      );
      return c;
    })();
  }
  return g.__pgReady;
}

// Convierte placeholders estilo SQLite (?) a Postgres ($1, $2, …).
function toPg(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

type RunResult = { rows: Record<string, unknown>[]; rowCount: number };

async function run(sql: string, args: InValue[] = []): Promise<RunResult> {
  const c = await ready();
  const res = await c.unsafe(toPg(sql), args as never[]);
  const rows = res as unknown as Record<string, unknown>[];
  return { rows, rowCount: rows.length };
}

type InValue = string | number | boolean | null;

// ---------- Tipos ----------
export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  nombre: string;
  empresa: string;
  rut: string;
  plan: string;
  role: string;
  onboarded: number;
  created_at: string;
}

// Admin si el rol es 'admin' o el email está en ADMIN_EMAILS.
// Sin ADMIN_EMAILS configurado (modo demo), el email demo es admin.
export function isAdminEmail(email: string): boolean {
  const env = (process.env.ADMIN_EMAILS || "")
    .toLowerCase()
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (env.length) return env.includes(email.toLowerCase());
  // Modo demo: el email demo es admin SOLO fuera de producción.
  // En producción, los admins se definen por rol en DB o por ADMIN_EMAILS.
  return (
    process.env.NODE_ENV !== "production" &&
    email.toLowerCase() === "demo@licitapro.cl"
  );
}

export interface UserProfile {
  id: number;
  email: string;
  nombre: string;
  empresa: string;
  rut: string;
  plan: string;
  onboarded: boolean;
  role: string;
  isAdmin: boolean;
  capacidades: string[];
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
  // Admin si está en ADMIN_EMAILS, o si es el primer usuario real (no el demo).
  const esDemo = input.email.toLowerCase() === "demo@licitapro.cl";
  const total = n(
    (await run("SELECT COUNT(*) AS c FROM users")).rows[0]?.c
  );
  const role =
    isAdminEmail(input.email) || (!esDemo && total === 0) ? "admin" : "user";
  const r = await run(
    "INSERT INTO users (email, password_hash, nombre, empresa, role) VALUES (?, ?, ?, ?, ?) RETURNING id",
    [input.email.toLowerCase(), input.passwordHash, input.nombre, input.empresa ?? "", role]
  );
  const userId = Number(r.rows[0].id);
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

  const esAdmin = s(u.role) === "admin" || isAdminEmail(s(u.email));
  // Capacidades según el plan. Admin = todas. Plan inexistente = todas (no castigar).
  const { CAPACIDADES } = await import("@/lib/capacidades");
  const todas = CAPACIDADES.map((c) => c.key);
  const planRow = await getPlanById(s(u.plan));
  const capacidades = esAdmin ? todas : planRow ? planRow.features : todas;

  return {
    id: n(u.id),
    email: s(u.email),
    nombre: s(u.nombre),
    empresa: s(u.empresa),
    rut: s(u.rut),
    plan: s(u.plan),
    onboarded: n(u.onboarded) === 1,
    role: s(u.role) || "user",
    isAdmin: esAdmin,
    capacidades,
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

// ===================== ADMIN =====================
export interface AdminUser {
  id: number;
  email: string;
  nombre: string;
  empresa: string;
  plan: string;
  role: string;
  onboarded: boolean;
  guardadas: number;
  createdAt: string;
}

export async function listUsers(): Promise<AdminUser[]> {
  const r = await run(
    `SELECT u.id, u.email, u.nombre, u.empresa, u.plan, u.role, u.onboarded, u.created_at::text AS created_at,
            (SELECT COUNT(*) FROM saved sv WHERE sv.user_id = u.id) AS guardadas
     FROM users u ORDER BY u.id DESC`
  );
  return r.rows.map((row) => {
    const o = row as Row;
    return {
      id: n(o.id),
      email: s(o.email),
      nombre: s(o.nombre),
      empresa: s(o.empresa),
      plan: s(o.plan),
      role: s(o.role) || "user",
      onboarded: n(o.onboarded) === 1,
      guardadas: n(o.guardadas),
      createdAt: s(o.created_at),
    };
  });
}

export async function adminStats() {
  const totalUsers = n((await run("SELECT COUNT(*) AS c FROM users")).rows[0]?.c);
  const onboarded = n(
    (await run("SELECT COUNT(*) AS c FROM users WHERE onboarded = 1")).rows[0]?.c
  );
  const guardadas = n((await run("SELECT COUNT(*) AS c FROM saved")).rows[0]?.c);
  const porPlan = (
    await run("SELECT plan, COUNT(*) AS c FROM users GROUP BY plan")
  ).rows.map((r) => ({ plan: s((r as Row).plan), total: n((r as Row).c) }));
  const recaudado = n(
    (await run("SELECT COALESCE(SUM(monto),0) AS t FROM payments WHERE estado='pagado'")).rows[0]?.t
  );
  return { totalUsers, onboarded, guardadas, porPlan, recaudado };
}

export async function setUserPlan(userId: number, plan: string) {
  await run("UPDATE users SET plan = ? WHERE id = ?", [plan, userId]);
}

export async function setUserRole(userId: number, role: string) {
  await run("UPDATE users SET role = ? WHERE id = ?", [
    role === "admin" ? "admin" : "user",
    userId,
  ]);
}

export async function adminCreateUser(input: {
  email: string;
  passwordHash: string;
  nombre: string;
  empresa: string;
  plan: string;
  role: string;
}): Promise<number> {
  const r = await run(
    "INSERT INTO users (email, password_hash, nombre, empresa, plan, role, onboarded) VALUES (?, ?, ?, ?, ?, ?, 1) RETURNING id",
    [
      input.email.toLowerCase(),
      input.passwordHash,
      input.nombre,
      input.empresa,
      input.plan,
      input.role === "admin" ? "admin" : "user",
    ]
  );
  const userId = Number(r.rows[0].id);
  await run("INSERT INTO settings (user_id) VALUES (?)", [userId]);
  return userId;
}

export async function adminUpdateUser(
  userId: number,
  data: { nombre: string; empresa: string; plan: string; role: string }
) {
  await run(
    "UPDATE users SET nombre = ?, empresa = ?, plan = ?, role = ? WHERE id = ?",
    [data.nombre, data.empresa, data.plan, data.role === "admin" ? "admin" : "user", userId]
  );
}

export async function deleteUser(userId: number) {
  await run("DELETE FROM saved WHERE user_id = ?", [userId]);
  await run("DELETE FROM payments WHERE user_id = ?", [userId]);
  await run("DELETE FROM settings WHERE user_id = ?", [userId]);
  await run("DELETE FROM users WHERE id = ?", [userId]);
}

export interface Pago {
  id: number;
  usuario: string;
  email: string;
  plan: string;
  monto: number;
  estado: string;
  metodo: string;
  fecha: string;
}

export async function listPayments(): Promise<Pago[]> {
  const r = await run(
    `SELECT p.id, p.plan, p.monto, p.estado, p.metodo, p.fecha::text AS fecha,
            u.nombre AS usuario, u.email
     FROM payments p JOIN users u ON u.id = p.user_id
     ORDER BY p.fecha DESC LIMIT 200`
  );
  return r.rows.map((row) => {
    const o = row as Row;
    return {
      id: n(o.id),
      usuario: s(o.usuario),
      email: s(o.email),
      plan: s(o.plan),
      monto: n(o.monto),
      estado: s(o.estado),
      metodo: s(o.metodo),
      fecha: s(o.fecha),
    };
  });
}

export async function createPaymentRow(input: {
  userId: number;
  plan: string;
  monto: number;
  metodo?: string;
  estado?: string;
}): Promise<number> {
  const r = await run(
    "INSERT INTO payments (user_id, plan, monto, estado, metodo) VALUES (?, ?, ?, ?, ?) RETURNING id",
    [input.userId, input.plan, input.monto, input.estado ?? "pendiente", input.metodo ?? "Flow"]
  );
  return Number(r.rows[0].id);
}

export async function getPaymentById(id: number): Promise<
  { id: number; userId: number; plan: string; monto: number; estado: string } | null
> {
  const r = await run("SELECT * FROM payments WHERE id = ?", [id]);
  const o = r.rows[0] as Row | undefined;
  if (!o) return null;
  return {
    id: n(o.id),
    userId: n(o.user_id),
    plan: s(o.plan),
    monto: n(o.monto),
    estado: s(o.estado),
  };
}

export async function setPaymentEstado(id: number, estado: string) {
  await run("UPDATE payments SET estado = ? WHERE id = ?", [estado, id]);
}

export async function paymentStats() {
  const total = n(
    (await run("SELECT COALESCE(SUM(monto),0) AS t FROM payments WHERE estado='pagado'")).rows[0]?.t
  );
  const cantidad = n((await run("SELECT COUNT(*) AS c FROM payments")).rows[0]?.c);
  const pagados = n(
    (await run("SELECT COUNT(*) AS c FROM payments WHERE estado='pagado'")).rows[0]?.c
  );
  return { total, cantidad, pagados };
}

// Genera pagos de ejemplo si la tabla está vacía (datos ilustrativos).
export async function seedPaymentsIfEmpty() {
  const c = n((await run("SELECT COUNT(*) AS c FROM payments")).rows[0]?.c);
  if (c > 0) return;
  const precios: Record<string, number> = {
    Trial: 4990,
    "Plan Detecta": 14990,
    "Plan Gana": 34990,
    Gana: 34990,
  };
  const users = await run("SELECT id, plan FROM users");
  for (const row of users.rows) {
    const o = row as Row;
    const plan = s(o.plan);
    const monto = precios[plan] ?? 4990;
    // 1-3 pagos por usuario en meses recientes
    const nPagos = 1 + (n(o.id) % 3);
    for (let m = 0; m < nPagos; m++) {
      await run(
        `INSERT INTO payments (user_id, plan, monto, estado, metodo, fecha)
         VALUES (?, ?, ?, 'pagado', ?, now() + (?::interval))`,
        [n(o.id), plan, monto, m % 2 ? "Webpay" : "Transferencia", `-${m} months`]
      );
    }
  }
}

// ---------- Planes (CRUD) ----------
import { PLANES_SEED, type Plan } from "@/lib/planes";

function rowToPlan(o: Row): Plan {
  return {
    id: s(o.id),
    nombre: s(o.nombre),
    precio: n(o.precio),
    periodo: s(o.periodo),
    features: JSON.parse(s(o.features) || "[]") as string[],
    destacado: n(o.destacado) === 1,
    activo: n(o.activo) === 1,
    orden: n(o.orden),
  };
}

export async function seedPlansIfEmpty() {
  const c = n((await run("SELECT COUNT(*) AS c FROM plans")).rows[0]?.c);
  if (c > 0) return;
  for (const p of PLANES_SEED) {
    await run(
      "INSERT INTO plans (id, nombre, precio, periodo, features, destacado, activo, orden) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [p.id, p.nombre, p.precio, p.periodo, JSON.stringify(p.features), p.destacado ? 1 : 0, 1, p.orden]
    );
  }
}

export async function getPlanes(opts?: { all?: boolean }): Promise<Plan[]> {
  await seedPlansIfEmpty();
  const where = opts?.all ? "" : "WHERE activo = 1";
  const r = await run(`SELECT * FROM plans ${where} ORDER BY orden, precio`);
  return r.rows.map((row) => rowToPlan(row as Row));
}

export async function getPlanById(id: string): Promise<Plan | null> {
  const r = await run("SELECT * FROM plans WHERE id = ?", [id]);
  const o = r.rows[0] as Row | undefined;
  return o ? rowToPlan(o) : null;
}

export async function createPlan(p: {
  id: string;
  nombre: string;
  precio: number;
  periodo: string;
  features: string[];
  destacado: boolean;
  activo: boolean;
  orden: number;
}) {
  await run(
    "INSERT INTO plans (id, nombre, precio, periodo, features, destacado, activo, orden) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [p.id, p.nombre, p.precio, p.periodo, JSON.stringify(p.features), p.destacado ? 1 : 0, p.activo ? 1 : 0, p.orden]
  );
}

export async function updatePlan(
  id: string,
  p: {
    nombre: string;
    precio: number;
    periodo: string;
    features: string[];
    destacado: boolean;
    activo: boolean;
    orden: number;
  }
) {
  await run(
    "UPDATE plans SET nombre = ?, precio = ?, periodo = ?, features = ?, destacado = ?, activo = ?, orden = ? WHERE id = ?",
    [p.nombre, p.precio, p.periodo, JSON.stringify(p.features), p.destacado ? 1 : 0, p.activo ? 1 : 0, p.orden, id]
  );
}

export async function deletePlan(id: string) {
  await run("DELETE FROM plans WHERE id = ?", [id]);
}

// ---------- Config global ----------
export async function getConfig(): Promise<Record<string, string>> {
  const r = await run("SELECT clave, valor FROM app_config");
  const out: Record<string, string> = {};
  r.rows.forEach((row) => {
    const o = row as Row;
    out[s(o.clave)] = s(o.valor);
  });
  return out;
}

export async function setConfig(entries: Record<string, string>) {
  for (const [clave, valor] of Object.entries(entries)) {
    await run(
      `INSERT INTO app_config (clave, valor) VALUES (?, ?)
       ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`,
      [clave, valor]
    );
  }
}
