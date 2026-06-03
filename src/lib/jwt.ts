import { SignJWT, jwtVerify } from "jose";

// Módulo seguro para edge (no importa next/headers): usable en middleware.
export const SESSION_COOKIE = "licitapro_session";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-cambia-esto-en-produccion-licitapro-2026"
);

export async function signSession(userId: number): Promise<string> {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    const uid = payload.uid;
    return typeof uid === "number" ? uid : null;
  } catch {
    return null;
  }
}
