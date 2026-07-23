import "server-only";
import postgres, { type Sql } from "postgres";
import { exerciseDate } from "@/lib/time";

let client: Sql | null = null;
let schemaPromise: Promise<void> | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function sql(): Sql {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }
  if (!client) {
    client = postgres(process.env.DATABASE_URL, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 15,
      prepare: false,
      ssl: "require",
    });
  }
  return client;
}

export async function ensureSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = createSchema().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

async function createSchema(): Promise<void> {
  const db = sql();
  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      password_hash TEXT,
      wechat_openid TEXT,
      joined_on DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS wechat_openid TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS users_name_lower_idx ON users (LOWER(name));
    CREATE UNIQUE INDEX IF NOT EXISTS users_wechat_openid_idx
      ON users (wechat_openid) WHERE wechat_openid IS NOT NULL;

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS checkins (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      exercise_date DATE NOT NULL,
      seconds INTEGER NOT NULL CHECK (seconds BETWEEN 1 AND 7200),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, exercise_date)
    );
    CREATE INDEX IF NOT EXISTS checkins_date_seconds_idx ON checkins(exercise_date, seconds DESC);

    CREATE TABLE IF NOT EXISTS leave_requests (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      start_date DATE NOT NULL,
      days INTEGER NOT NULL CHECK (days BETWEEN 1 AND 30),
      reason TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
      reviewed_by BIGINT REFERENCES users(id),
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS leave_requests_status_idx ON leave_requests(status, start_date);

    CREATE TABLE IF NOT EXISTS payments (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
      recorded_by BIGINT NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS penalties (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      exercise_date DATE NOT NULL,
      amount_cents INTEGER NOT NULL DEFAULT 500 CHECK (amount_cents > 0),
      payment_id BIGINT REFERENCES payments(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, exercise_date)
    );
    CREATE INDEX IF NOT EXISTS penalties_user_unpaid_idx ON penalties(user_id) WHERE payment_id IS NULL;
  `);

  const today = exerciseDate();
  await db`
    INSERT INTO users (name, is_admin, joined_on)
    VALUES ('audrey', TRUE, ${today}), ('zhihong', TRUE, ${today})
    ON CONFLICT DO NOTHING
  `;
}

export async function materializePenalties(today = exerciseDate()): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO penalties (user_id, exercise_date, amount_cents)
    SELECT u.id, days.exercise_date, 500
    FROM users u
    CROSS JOIN LATERAL (
      SELECT generate_series(u.joined_on, ${today}::date - 1, interval '1 day')::date AS exercise_date
    ) days
    WHERE NOT EXISTS (
      SELECT 1 FROM checkins c
      WHERE c.user_id = u.id AND c.exercise_date = days.exercise_date
    )
    AND NOT EXISTS (
      SELECT 1 FROM leave_requests l
      WHERE l.user_id = u.id
        AND l.status = 'approved'
        AND days.exercise_date >= l.start_date
        AND days.exercise_date < l.start_date + l.days
    )
    ON CONFLICT (user_id, exercise_date) DO NOTHING
  `;
}
