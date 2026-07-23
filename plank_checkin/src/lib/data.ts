import "server-only";
import { ensureSchema, materializePenalties, sql } from "@/lib/db";
import { addDays, exerciseDate } from "@/lib/time";
import type {
  AdminUser,
  Bootstrap,
  CheckinRow,
  Dashboard,
  LeaveRequest,
  PublicUser,
  RankingRow,
  TrendPoint,
} from "@/lib/types";

type SessionUser = { id: number; name: string; isAdmin: boolean };

function publicUser(row: {
  id: number;
  name: string;
  is_admin: boolean;
  has_password: boolean;
}): PublicUser {
  return {
    id: Number(row.id),
    name: row.name,
    isAdmin: row.is_admin,
    hasPassword: row.has_password,
  };
}

export async function listUsers(): Promise<PublicUser[]> {
  await ensureSchema();
  const rows = await sql()<
    { id: number; name: string; is_admin: boolean; has_password: boolean }[]
  >`
    SELECT id, name, is_admin, (password_hash IS NOT NULL) AS has_password
    FROM users
    ORDER BY is_admin DESC, LOWER(name)
  `;
  return rows.map(publicUser);
}

export async function buildBootstrap(
  sessionUser: SessionUser | null,
): Promise<Bootstrap> {
  const usersPromise = listUsers();
  if (!sessionUser) {
    return {
      configured: true,
      users: await usersPromise,
      currentUser: null,
      dashboard: null,
    };
  }

  const [users, dashboard] = await Promise.all([
    usersPromise,
    buildDashboard(sessionUser),
  ]);
  const currentUser = users.find((user) => user.id === sessionUser.id) || null;
  return { configured: true, users, currentUser, dashboard };
}

export async function buildDashboard(user: SessionUser): Promise<Dashboard> {
  await ensureSchema();
  const today = exerciseDate();
  const yesterday = addDays(today, -1);
  const trendStart = addDays(today, -9);
  await materializePenalties(today);
  const db = sql();

  const [
    totals,
    yesterdayStats,
    champion,
    rankingRows,
    trendRows,
    reportStats,
    historyRows,
    pendingRows,
    adminRows,
  ] = await Promise.all([
    db<{
      total_pool: number;
      my_due: number;
    }[]>`
      SELECT
        COALESCE((SELECT SUM(amount_cents) FROM penalties), 0)::int AS total_pool,
        COALESCE((SELECT SUM(amount_cents) FROM penalties WHERE user_id = ${user.id} AND payment_id IS NULL), 0)::int AS my_due
    `,
    db<{ average_seconds: number; median_seconds: number }[]>`
      SELECT
        COALESCE(ROUND(AVG(seconds)), 0)::int AS average_seconds,
        COALESCE(ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY seconds)), 0)::int AS median_seconds
      FROM checkins WHERE exercise_date = ${yesterday}::date
    `,
    db<{ name: string; seconds: number }[]>`
      SELECT u.name, c.seconds
      FROM checkins c JOIN users u ON u.id = c.user_id
      WHERE c.exercise_date = ${yesterday}::date
      ORDER BY c.seconds DESC, LOWER(u.name)
      LIMIT 1
    `,
    db<{ id: number; name: string; seconds: number | null }[]>`
      SELECT u.id, u.name, c.seconds
      FROM users u
      LEFT JOIN checkins c ON c.user_id = u.id AND c.exercise_date = ${today}::date
      ORDER BY c.seconds DESC NULLS LAST, LOWER(u.name)
    `,
    db<{ date: string; participants: number; average_seconds: number }[]>`
      SELECT days.date::date::text AS date,
        COUNT(c.id)::int AS participants,
        COALESCE(ROUND(AVG(c.seconds)), 0)::int AS average_seconds
      FROM generate_series(${trendStart}::date, ${today}::date, interval '1 day') days(date)
      LEFT JOIN checkins c ON c.exercise_date = days.date::date
      GROUP BY days.date ORDER BY days.date
    `,
    db<{
      total_checkins: number;
      average_seconds: number;
      median_seconds: number;
      best_seconds: number;
    }[]>`
      SELECT COUNT(*)::int AS total_checkins,
        COALESCE(ROUND(AVG(seconds)), 0)::int AS average_seconds,
        COALESCE(ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY seconds)), 0)::int AS median_seconds,
        COALESCE(MAX(seconds), 0)::int AS best_seconds
      FROM checkins WHERE user_id = ${user.id}
    `,
    db<{ date: string; seconds: number; created_at: Date }[]>`
      SELECT exercise_date::text AS date, seconds, created_at
      FROM checkins WHERE user_id = ${user.id}
      ORDER BY exercise_date DESC LIMIT 180
    `,
    user.isAdmin
      ? db<{
          id: number;
          user_name: string;
          start_date: string;
          days: number;
          reason: string;
          status: "pending" | "approved" | "declined";
        }[]>`
          SELECT l.id, u.name AS user_name, l.start_date::text, l.days, l.reason, l.status
          FROM leave_requests l JOIN users u ON u.id = l.user_id
          WHERE l.status = 'pending'
          ORDER BY l.created_at
        `
      : Promise.resolve([]),
    user.isAdmin
      ? db<{
          id: number;
          name: string;
          is_admin: boolean;
          has_password: boolean;
          due_cents: number;
        }[]>`
          SELECT u.id, u.name, u.is_admin, (u.password_hash IS NOT NULL) AS has_password,
            COALESCE(SUM(p.amount_cents) FILTER (WHERE p.payment_id IS NULL), 0)::int AS due_cents
          FROM users u LEFT JOIN penalties p ON p.user_id = u.id
          GROUP BY u.id ORDER BY u.is_admin DESC, LOWER(u.name)
        `
      : Promise.resolve([]),
  ]);

  const ranking: RankingRow[] = rankingRows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    seconds: row.seconds == null ? null : Number(row.seconds),
  }));
  const trend: TrendPoint[] = trendRows.map((row) => ({
    date: row.date,
    participants: Number(row.participants),
    averageSeconds: Number(row.average_seconds),
  }));
  const history: CheckinRow[] = historyRows.map((row) => ({
    date: row.date,
    seconds: Number(row.seconds),
    createdAt: row.created_at.toISOString(),
  }));
  const pendingLeaves: LeaveRequest[] = pendingRows.map((row) => ({
    id: Number(row.id),
    userName: row.user_name,
    startDate: row.start_date,
    days: Number(row.days),
    reason: row.reason,
    status: row.status,
  }));
  const adminUsers: AdminUser[] = adminRows.map((row) => ({
    ...publicUser(row),
    dueCents: Number(row.due_cents),
  }));

  return {
    exerciseDate: today,
    totalPoolCents: Number(totals[0]?.total_pool || 0),
    myDueCents: Number(totals[0]?.my_due || 0),
    yesterday: {
      champion: champion[0]?.name || null,
      championSeconds: Number(champion[0]?.seconds || 0),
      averageSeconds: Number(yesterdayStats[0]?.average_seconds || 0),
      medianSeconds: Number(yesterdayStats[0]?.median_seconds || 0),
    },
    ranking,
    trend,
    report: {
      totalCheckins: Number(reportStats[0]?.total_checkins || 0),
      averageSeconds: Number(reportStats[0]?.average_seconds || 0),
      medianSeconds: Number(reportStats[0]?.median_seconds || 0),
      bestSeconds: Number(reportStats[0]?.best_seconds || 0),
      history,
    },
    pendingLeaves,
    adminUsers,
  };
}
