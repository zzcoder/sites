import "server-only";
import { cookies } from "next/headers";
import { addDays, exerciseDate } from "@/lib/time";
import type { Bootstrap, CheckinRow, PublicUser } from "@/lib/types";

type DemoUser = PublicUser & { password: string | null; dueCents: number };
type DemoLeave = {
  id: number;
  userId: number;
  startDate: string;
  days: number;
  reason: string;
  status: "pending" | "approved" | "declined";
};
type DemoState = {
  users: DemoUser[];
  checkins: Record<number, CheckinRow[]>;
  leaves: DemoLeave[];
  nextUserId: number;
  nextLeaveId: number;
};

declare global {
  var __plankDemoState: DemoState | undefined;
}

const DEMO_COOKIE = "plank_demo_user";

function state(): DemoState {
  if (!globalThis.__plankDemoState) {
    const today = exerciseDate();
    const history = (values: number[]): CheckinRow[] => values.map((seconds, index) => ({
      date: addDays(today, -(index + 1)),
      seconds,
      createdAt: `${addDays(today, -(index + 1))}T12:00:00.000Z`,
    }));
    globalThis.__plankDemoState = {
      users: [
        { id: 1, name: "audrey", isAdmin: true, hasPassword: false, password: null, dueCents: 500 },
        { id: 2, name: "zhihong", isAdmin: true, hasPassword: true, password: "winter", dueCents: 0 },
        { id: 3, name: "mina", isAdmin: false, hasPassword: true, password: "plank", dueCents: 1000 },
        { id: 4, name: "leo", isAdmin: false, hasPassword: false, password: null, dueCents: 500 },
      ],
      checkins: {
        1: history([142, 128, 135, 120, 146, 133, 125, 116, 130]),
        2: history([168, 155, 149, 172, 160, 151, 158, 144]),
        3: history([110, 119, 105, 124, 114, 121, 112]),
        4: history([92, 88, 100, 95, 97, 84]),
      },
      leaves: [{ id: 1, userId: 3, startDate: today, days: 2, reason: "Weekend trip", status: "pending" }],
      nextUserId: 5,
      nextLeaveId: 2,
    };
  }
  return globalThis.__plankDemoState;
}

export async function demoBootstrap(): Promise<Bootstrap> {
  const demo = state();
  const cookieStore = await cookies();
  const currentId = Number(cookieStore.get(DEMO_COOKIE)?.value || 0);
  const actor = demo.users.find((user) => user.id === currentId) || null;
  const users = demo.users.map(toPublicUser);
  if (!actor) return { configured: true, users, currentUser: null, dashboard: null };

  const today = exerciseDate();
  const yesterday = addDays(today, -1);
  const todayRows = demo.users.map((user) => ({
    id: user.id,
    name: user.name,
    seconds: demo.checkins[user.id]?.find((row) => row.date === today)?.seconds ?? null,
  })).sort((a, b) => (b.seconds ?? -1) - (a.seconds ?? -1));
  const yesterdayRows = demo.users.flatMap((user) => {
    const row = demo.checkins[user.id]?.find((item) => item.date === yesterday);
    return row ? [{ name: user.name, seconds: row.seconds }] : [];
  }).sort((a, b) => b.seconds - a.seconds);
  const sortedYesterday = yesterdayRows.map((row) => row.seconds).sort((a, b) => a - b);
  const average = sortedYesterday.length
    ? Math.round(sortedYesterday.reduce((sum, value) => sum + value, 0) / sortedYesterday.length)
    : 0;
  const median = sortedYesterday.length
    ? sortedYesterday[Math.floor(sortedYesterday.length / 2)]
    : 0;
  const history = demo.checkins[actor.id] || [];
  const reportValues = history.map((row) => row.seconds);

  return {
    configured: true,
    users,
    currentUser: toPublicUser(actor),
    dashboard: {
      exerciseDate: today,
      totalPoolCents: demo.users.reduce((sum, user) => sum + user.dueCents, 0),
      myDueCents: actor.dueCents,
      yesterday: {
        champion: yesterdayRows[0]?.name || null,
        championSeconds: yesterdayRows[0]?.seconds || 0,
        averageSeconds: average,
        medianSeconds: median,
      },
      ranking: todayRows,
      trend: Array.from({ length: 10 }, (_, index) => {
        const date = addDays(today, index - 9);
        const values = demo.users.flatMap((user) => {
          const row = demo.checkins[user.id]?.find((item) => item.date === date);
          return row ? [row.seconds] : [];
        });
        return {
          date,
          participants: values.length,
          averageSeconds: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0,
        };
      }),
      report: {
        totalCheckins: history.length,
        averageSeconds: reportValues.length ? Math.round(reportValues.reduce((sum, value) => sum + value, 0) / reportValues.length) : 0,
        medianSeconds: reportValues.length ? [...reportValues].sort((a, b) => a - b)[Math.floor(reportValues.length / 2)] : 0,
        bestSeconds: reportValues.length ? Math.max(...reportValues) : 0,
        history,
      },
      pendingLeaves: actor.isAdmin
        ? demo.leaves.filter((leave) => leave.status === "pending").map((leave) => ({
          id: leave.id,
          userName: demo.users.find((user) => user.id === leave.userId)?.name || "Unknown",
          startDate: leave.startDate,
          days: leave.days,
          reason: leave.reason,
          status: leave.status,
        }))
        : [],
      adminUsers: actor.isAdmin ? demo.users.map((user) => ({ ...toPublicUser(user), dueCents: user.dueCents })) : [],
    },
  };
}

export async function demoAction(body: Record<string, unknown>): Promise<Response> {
  const demo = state();
  const action = String(body.action || "");
  const cookieStore = await cookies();

  if (action === "authenticate") {
    const user = demo.users.find((item) => item.id === Number(body.userId));
    const password = String(body.password || "");
    if (!user) return demoError("User not found.", 404);
    if (user.password && user.password !== password) return demoError("Password does not match.", 401);
    if (!user.password) {
      user.password = password;
      user.hasPassword = true;
    }
    cookieStore.set(DEMO_COOKIE, String(user.id), { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365, path: "/" });
    return Response.json({ ok: true });
  }
  if (action === "logout") {
    cookieStore.delete(DEMO_COOKIE);
    return Response.json({ ok: true });
  }

  const actorId = Number(cookieStore.get(DEMO_COOKIE)?.value || 0);
  const actor = demo.users.find((user) => user.id === actorId);
  if (!actor) return demoError("Please choose your user again.", 401);
  const requireAdmin = () => {
    if (!actor.isAdmin) throw new Error("ADMIN_REQUIRED");
  };

  try {
    if (action === "checkin") {
      const seconds = Math.max(1, Math.min(7200, Number(body.seconds)));
      const history = demo.checkins[actor.id] ||= [];
      const today = exerciseDate();
      const existing = history.find((row) => row.date === today);
      if (existing) existing.seconds = seconds;
      else history.unshift({ date: today, seconds, createdAt: new Date().toISOString() });
    } else if (action === "requestLeave") {
      demo.leaves.push({ id: demo.nextLeaveId++, userId: actor.id, startDate: exerciseDate(), days: Number(body.days), reason: String(body.reason || ""), status: "pending" });
    } else if (action === "addUser") {
      requireAdmin();
      const name = String(body.name || "").trim();
      demo.users.push({ id: demo.nextUserId++, name, isAdmin: Boolean(body.isAdmin), hasPassword: false, password: null, dueCents: 0 });
    } else if (action === "reviewLeave") {
      requireAdmin();
      const leave = demo.leaves.find((item) => item.id === Number(body.requestId));
      if (leave) leave.status = body.decision === "approved" ? "approved" : "declined";
    } else if (action === "clearDue") {
      requireAdmin();
      const user = demo.users.find((item) => item.id === Number(body.userId));
      if (user) user.dueCents = 0;
    } else if (action === "clearPassword") {
      requireAdmin();
      const user = demo.users.find((item) => item.id === Number(body.userId));
      if (user) {
        user.password = null;
        user.hasPassword = false;
        if (user.id === actor.id) cookieStore.delete(DEMO_COOKIE);
      }
    } else {
      return demoError("Unknown action.");
    }
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_REQUIRED") return demoError("Admin access required.", 403);
    return demoError("Demo action failed.", 400);
  }
}

function toPublicUser(user: DemoUser): PublicUser {
  return { id: user.id, name: user.name, isAdmin: user.isAdmin, hasPassword: user.hasPassword };
}

function demoError(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}
