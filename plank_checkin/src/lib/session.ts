import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { ensureSchema, sql } from "@/lib/db";

const COOKIE_NAME = "plank_session";
const SESSION_SECONDS = 60 * 60 * 24 * 365;

export type SessionUser = {
  id: number;
  name: string;
  isAdmin: boolean;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function currentSessionUser(
  bearerToken?: string | null,
): Promise<SessionUser | null> {
  await ensureSchema();
  const token = bearerToken || (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const rows = await sql()<
    { id: number; name: string; is_admin: boolean }[]
  >`
    SELECT u.id, u.name, u.is_admin
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${hashToken(token)} AND s.expires_at > NOW()
    LIMIT 1
  `;
  const user = rows[0];
  return user
    ? { id: Number(user.id), name: user.name, isAdmin: user.is_admin }
    : null;
}

export async function createPersistentSession(
  userId: number,
  setBrowserCookie = true,
): Promise<string> {
  await ensureSchema();
  const token = randomBytes(32).toString("base64url");
  await sql()`
    INSERT INTO sessions (token_hash, user_id, expires_at)
    VALUES (${hashToken(token)}, ${userId}, NOW() + INTERVAL '365 days')
  `;
  if (setBrowserCookie) {
    (await cookies()).set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_SECONDS,
      priority: "high",
    });
  }
  return token;
}

export async function destroyCurrentSession(
  bearerToken?: string | null,
): Promise<void> {
  const cookieStore = await cookies();
  const token = bearerToken || cookieStore.get(COOKIE_NAME)?.value;
  if (token && process.env.DATABASE_URL) {
    await ensureSchema();
    await sql()`DELETE FROM sessions WHERE token_hash = ${hashToken(token)}`;
  }
  if (!bearerToken) cookieStore.delete(COOKIE_NAME);
}

export async function invalidateUserSessions(userId: number): Promise<void> {
  await sql()`DELETE FROM sessions WHERE user_id = ${userId}`;
}
