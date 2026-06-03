import "server-only";
import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

// Base de datos SQLite local persistida en ./data/licitapro.db
const dataDir = path.join(process.cwd(), "data");
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

// Reutiliza la conexión entre recargas en desarrollo.
const g = globalThis as unknown as { __licitaproDb?: Database.Database };

function init(): Database.Database {
  const db = new Database(path.join(dataDir, "licitapro.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nombre TEXT NOT NULL,
      empresa TEXT NOT NULL DEFAULT '',
      rut TEXT NOT NULL DEFAULT '',
      plan TEXT NOT NULL DEFAULT 'Trial',
      onboarded INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
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
    );

    CREATE TABLE IF NOT EXISTS saved (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      codigo TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, codigo)
    );
  `);
  return db;
}

export const db = g.__licitaproDb ?? (g.__licitaproDb = init());

// ---------- Tipos de fila ----------
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

export interface SettingsRow {
  user_id: number;
  rubros: string;
  regiones: string;
  alert_correo: number;
  alert_whatsapp: number;
  alert_resumen: number;
  umbral: number;
  theme: string;
  accent: string;
  app_name: string;
}

// ---------- Acceso a datos ----------
export function getUserByEmail(email: string): UserRow | undefined {
  return db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase()) as UserRow | undefined;
}

export function getUserById(id: number): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | UserRow
    | undefined;
}

export function createUser(input: {
  email: string;
  passwordHash: string;
  nombre: string;
  empresa?: string;
}): number {
  const info = db
    .prepare(
      "INSERT INTO users (email, password_hash, nombre, empresa) VALUES (?, ?, ?, ?)"
    )
    .run(
      input.email.toLowerCase(),
      input.passwordHash,
      input.nombre,
      input.empresa ?? ""
    );
  const userId = Number(info.lastInsertRowid);
  db.prepare("INSERT INTO settings (user_id) VALUES (?)").run(userId);
  return userId;
}

export function getSettings(userId: number): SettingsRow {
  let row = db
    .prepare("SELECT * FROM settings WHERE user_id = ?")
    .get(userId) as SettingsRow | undefined;
  if (!row) {
    db.prepare("INSERT INTO settings (user_id) VALUES (?)").run(userId);
    row = db
      .prepare("SELECT * FROM settings WHERE user_id = ?")
      .get(userId) as SettingsRow;
  }
  return row;
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

export function getProfile(userId: number): UserProfile | null {
  const u = getUserById(userId);
  if (!u) return null;
  const s = getSettings(userId);
  const iniciales = u.nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return {
    id: u.id,
    email: u.email,
    nombre: u.nombre,
    empresa: u.empresa,
    rut: u.rut,
    plan: u.plan,
    onboarded: u.onboarded === 1,
    iniciales: iniciales || "U",
    rubros: JSON.parse(s.rubros) as string[],
    regiones: JSON.parse(s.regiones) as string[],
    alertCorreo: s.alert_correo === 1,
    alertWhatsapp: s.alert_whatsapp === 1,
    alertResumen: s.alert_resumen === 1,
    umbral: s.umbral,
    theme: s.theme === "dark" ? "dark" : "light",
    accent: s.accent,
    appName: s.app_name,
  };
}

export function completeOnboarding(
  userId: number,
  data: { empresa: string; rut: string; rubros: string[]; regiones: string[] }
) {
  db.prepare("UPDATE users SET empresa = ?, rut = ?, onboarded = 1 WHERE id = ?").run(
    data.empresa,
    data.rut,
    userId
  );
  db.prepare("UPDATE settings SET rubros = ?, regiones = ? WHERE user_id = ?").run(
    JSON.stringify(data.rubros),
    JSON.stringify(data.regiones),
    userId
  );
}

export function updateProfile(
  userId: number,
  data: { nombre: string; empresa: string; rut: string; rubros: string[]; regiones: string[] }
) {
  db.prepare("UPDATE users SET nombre = ?, empresa = ?, rut = ? WHERE id = ?").run(
    data.nombre,
    data.empresa,
    data.rut,
    userId
  );
  db.prepare("UPDATE settings SET rubros = ?, regiones = ? WHERE user_id = ?").run(
    JSON.stringify(data.rubros),
    JSON.stringify(data.regiones),
    userId
  );
}

export function updateAlerts(
  userId: number,
  data: {
    alertCorreo: boolean;
    alertWhatsapp: boolean;
    alertResumen: boolean;
    umbral: number;
  }
) {
  db.prepare(
    "UPDATE settings SET alert_correo = ?, alert_whatsapp = ?, alert_resumen = ?, umbral = ? WHERE user_id = ?"
  ).run(
    data.alertCorreo ? 1 : 0,
    data.alertWhatsapp ? 1 : 0,
    data.alertResumen ? 1 : 0,
    data.umbral,
    userId
  );
}

export function updateAppearance(
  userId: number,
  data: { theme: "light" | "dark"; accent: string; appName: string }
) {
  db.prepare(
    "UPDATE settings SET theme = ?, accent = ?, app_name = ? WHERE user_id = ?"
  ).run(data.theme, data.accent, data.appName, userId);
}

// ---------- Oportunidades guardadas ----------
export function listSavedCodes(userId: number): string[] {
  return (
    db.prepare("SELECT codigo FROM saved WHERE user_id = ?").all(userId) as {
      codigo: string;
    }[]
  ).map((r) => r.codigo);
}

export function listSaved(userId: number): unknown[] {
  return (
    db
      .prepare("SELECT data FROM saved WHERE user_id = ? ORDER BY created_at DESC")
      .all(userId) as { data: string }[]
  ).map((r) => JSON.parse(r.data));
}

export function toggleSaved(userId: number, codigo: string, data: unknown): boolean {
  const exists = db
    .prepare("SELECT 1 FROM saved WHERE user_id = ? AND codigo = ?")
    .get(userId, codigo);
  if (exists) {
    db.prepare("DELETE FROM saved WHERE user_id = ? AND codigo = ?").run(
      userId,
      codigo
    );
    return false;
  }
  db.prepare("INSERT INTO saved (user_id, codigo, data) VALUES (?, ?, ?)").run(
    userId,
    codigo,
    JSON.stringify(data)
  );
  return true;
}
