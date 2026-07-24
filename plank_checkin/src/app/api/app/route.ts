import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { buildBootstrap } from "@/lib/data";
import { demoAction, demoBootstrap } from "@/lib/demo";
import { ensureSchema, isDatabaseConfigured, sql } from "@/lib/db";
import {
  createPersistentSession,
  currentSessionUser,
  destroyCurrentSession,
  invalidateUserSessions,
} from "@/lib/session";
import { exerciseDate } from "@/lib/time";

export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}

export async function GET(request: Request) {
  if (process.env.DEMO_MODE === "1") return Response.json(await demoBootstrap());
  if (!isDatabaseConfigured()) {
    return Response.json({
      configured: false,
      users: [],
      currentUser: null,
      dashboard: null,
      error: "The database is waiting to be connected.",
    });
  }
  try {
    const user = await currentSessionUser(readBearerToken(request));
    return Response.json(await buildBootstrap(user));
  } catch (error) {
    console.error(error);
    return jsonError("Unable to load the check-in board.", 500);
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request.");
  }
  if (process.env.DEMO_MODE === "1") return demoAction(body);
  if (!isDatabaseConfigured()) return jsonError("Database is not connected.", 503);
  const action = z.string().safeParse(body.action);
  if (!action.success) return jsonError("Missing action.");

  try {
    await ensureSchema();
    if (action.data === "authenticate") return authenticate(body);
    if (action.data === "wechatAuthenticate") return authenticateWeChat(body);
    if (action.data === "logout") {
      await destroyCurrentSession(readBearerToken(request));
      return Response.json({ ok: true });
    }

    const actor = await currentSessionUser(readBearerToken(request));
    if (!actor) return jsonError("Please choose your user again.", 401);

    switch (action.data) {
      case "checkin": {
        const { seconds } = z.object({ seconds: z.coerce.number().int().min(1).max(7200) }).parse(body);
        await sql()`
          INSERT INTO checkins (user_id, exercise_date, seconds)
          VALUES (${actor.id}, ${exerciseDate()}::date, ${seconds})
          ON CONFLICT (user_id, exercise_date)
          DO UPDATE SET seconds = EXCLUDED.seconds, created_at = NOW()
        `;
        return Response.json({ ok: true });
      }
      case "requestLeave": {
        const input = z.object({
          days: z.coerce.number().int().min(1).max(30),
          reason: z.string().trim().max(240).default(""),
        }).parse(body);
        await sql()`
          INSERT INTO leave_requests (user_id, start_date, days, reason)
          VALUES (${actor.id}, ${exerciseDate()}::date, ${input.days}, ${input.reason})
        `;
        return Response.json({ ok: true });
      }
      case "addUser": {
        requireAdmin(actor.isAdmin);
        const input = z.object({
          name: z.string().trim().min(1).max(50),
          isAdmin: z.boolean().default(false),
        }).parse(body);
        await sql()`
          INSERT INTO users (name, is_admin, joined_on)
          VALUES (${input.name}, ${input.isAdmin}, ${exerciseDate()}::date)
        `;
        return Response.json({ ok: true });
      }
      case "reviewLeave": {
        requireAdmin(actor.isAdmin);
        const input = z.object({
          requestId: z.coerce.number().int().positive(),
          decision: z.enum(["approved", "declined"]),
        }).parse(body);
        await sql().begin(async (transaction) => {
          const rows = await transaction<{
            user_id: number;
            start_date: string;
            days: number;
          }[]>`
            UPDATE leave_requests SET status = ${input.decision}, reviewed_by = ${actor.id}, reviewed_at = NOW()
            WHERE id = ${input.requestId} AND status = 'pending'
            RETURNING user_id, start_date::text, days
          `;
          if (input.decision === "approved" && rows[0]) {
            await transaction`
              DELETE FROM penalties
              WHERE user_id = ${rows[0].user_id}
                AND payment_id IS NULL
                AND exercise_date >= ${rows[0].start_date}::date
                AND exercise_date < ${rows[0].start_date}::date + ${rows[0].days}
            `;
          }
        });
        return Response.json({ ok: true });
      }
      case "clearDue": {
        requireAdmin(actor.isAdmin);
        const { userId } = z.object({ userId: z.coerce.number().int().positive() }).parse(body);
        await sql().begin(async (transaction) => {
          const totals = await transaction<{ amount: number }[]>`
            SELECT COALESCE(SUM(amount_cents), 0)::int AS amount
            FROM penalties WHERE user_id = ${userId} AND payment_id IS NULL
          `;
          const amount = Number(totals[0]?.amount || 0);
          if (!amount) return;
          const payments = await transaction<{ id: number }[]>`
            INSERT INTO payments (user_id, amount_cents, recorded_by)
            VALUES (${userId}, ${amount}, ${actor.id}) RETURNING id
          `;
          await transaction`
            UPDATE penalties SET payment_id = ${payments[0].id}
            WHERE user_id = ${userId} AND payment_id IS NULL
          `;
        });
        return Response.json({ ok: true });
      }
      case "clearPassword": {
        requireAdmin(actor.isAdmin);
        const { userId } = z.object({ userId: z.coerce.number().int().positive() }).parse(body);
        await sql()`UPDATE users SET password_hash = NULL WHERE id = ${userId}`;
        await invalidateUserSessions(userId);
        return Response.json({ ok: true });
      }
      default:
        return jsonError("Unknown action.");
    }
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError(error.issues[0]?.message || "Invalid input.");
    if (error instanceof Error && error.message === "ADMIN_REQUIRED") {
      return jsonError("Admin access required.", 403);
    }
    if (String(error).includes("users_name_lower_idx")) {
      return jsonError("That user already exists.");
    }
    console.error(error);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}

async function authenticate(body: Record<string, unknown>) {
  const input = z.object({
    userId: z.coerce.number().int().positive(),
    password: z.string().min(1).max(100),
  }).parse(body);
  const rows = await sql()<{
    id: number;
    password_hash: string | null;
  }[]>`SELECT id, password_hash FROM users WHERE id = ${input.userId} LIMIT 1`;
  const user = rows[0];
  if (!user) return jsonError("User not found.", 404);
  if (user.password_hash) {
    if (!(await compare(input.password, user.password_hash))) {
      return jsonError("Password does not match.", 401);
    }
  } else {
    const passwordHash = await hash(input.password, 8);
    await sql()`
      UPDATE users SET password_hash = ${passwordHash}
      WHERE id = ${user.id} AND password_hash IS NULL
    `;
  }
  await createPersistentSession(Number(user.id));
  return Response.json({ ok: true });
}

async function authenticateWeChat(body: Record<string, unknown>) {
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;
  if (!appId || !appSecret) {
    return jsonError("WeChat login is waiting for the Mini Program credentials.", 503);
  }

  const input = z.object({
    code: z.string().trim().min(1).max(256),
    displayName: z.string().trim().min(1).max(50).optional(),
  }).parse(body);
  const parameters = new URLSearchParams({
    appid: appId,
    secret: appSecret,
    js_code: input.code,
    grant_type: "authorization_code",
  });
  const wechatResponse = await fetch(
    `https://api.weixin.qq.com/sns/jscode2session?${parameters}`,
    { cache: "no-store" },
  );
  const wechat = await wechatResponse.json() as {
    openid?: string;
    unionid?: string;
    errcode?: number;
    errmsg?: string;
  };
  if (!wechatResponse.ok || !wechat.openid) {
    console.error("WeChat code exchange failed", {
      status: wechatResponse.status,
      errcode: wechat.errcode,
      errmsg: wechat.errmsg,
    });
    return jsonError("WeChat could not verify this account. Please try again.", 401);
  }

  let users = await sql()<{
    id: number;
    name: string;
    is_admin: boolean;
  }[]>`
    SELECT id, name, is_admin
    FROM users
    WHERE wechat_openid = ${wechat.openid}
    LIMIT 1
  `;

  if (!users[0] && !input.displayName) {
    return Response.json({ ok: true, needsProfile: true });
  }

  if (!users[0] && input.displayName) {
    const matchingUsers = await sql()<{
      id: number;
      name: string;
      is_admin: boolean;
      wechat_openid: string | null;
    }[]>`
      SELECT id, name, is_admin, wechat_openid
      FROM users
      WHERE LOWER(name) = LOWER(${input.displayName})
      LIMIT 1
    `;
    const matchingUser = matchingUsers[0];

    if (matchingUser && !matchingUser.wechat_openid) {
      users = await sql()<{
        id: number;
        name: string;
        is_admin: boolean;
      }[]>`
        UPDATE users
        SET wechat_openid = ${wechat.openid}
        WHERE id = ${matchingUser.id} AND wechat_openid IS NULL
        RETURNING id, name, is_admin
      `;
    } else {
      const uniqueName = matchingUser
        ? `${input.displayName.slice(0, 43)} ${wechat.openid.slice(-6)}`
        : input.displayName;
      users = await sql()<{
        id: number;
        name: string;
        is_admin: boolean;
      }[]>`
        INSERT INTO users (name, is_admin, wechat_openid, joined_on)
        VALUES (${uniqueName}, FALSE, ${wechat.openid}, ${exerciseDate()}::date)
        RETURNING id, name, is_admin
      `;
    }
  }

  const user = users[0];
  if (!user) return jsonError("Unable to connect this WeChat account.", 500);
  const sessionToken = await createPersistentSession(Number(user.id), false);
  return Response.json({
    ok: true,
    needsProfile: false,
    sessionToken,
    user: {
      name: user.name,
      isAdmin: user.is_admin,
    },
  });
}

function readBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
}

function requireAdmin(isAdmin: boolean) {
  if (!isAdmin) throw new Error("ADMIN_REQUIRED");
}
