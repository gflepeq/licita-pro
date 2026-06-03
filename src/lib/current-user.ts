import "server-only";
import { getProfile, type UserProfile } from "./db";
import { getSessionUserId } from "./session";

/** Devuelve el perfil del usuario autenticado, o null si no hay sesión. */
export async function currentUser(): Promise<UserProfile | null> {
  const uid = await getSessionUserId();
  if (!uid) return null;
  return getProfile(uid);
}
