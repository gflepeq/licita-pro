import { cookies } from "next/headers";
import { SESSION_COOKIE, signSession, verifyToken } from "./jwt";

export { SESSION_COOKIE, verifyToken };

export async function createSessionCookie(userId: number) {
  const token = await signSession(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** userId de la sesión actual leyendo la cookie (server components / actions). */
export async function getSessionUserId(): Promise<number | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}
