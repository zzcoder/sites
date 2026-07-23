import pg from "pg";
import dns from "node:dns";

const { Pool } = pg;
dns.setDefaultResultOrder("ipv4first");

const rosterTable = `"plane-pull"`;
const voteTable = "plane_pull_shirt_votes";
const shirtColors = [
  "White",
  "Black",
  "Graphite",
  "Navy",
  "Deep Royal",
  "Light Blue",
  "Wow Pink",
  "Deep Red",
  "Safety Orange",
  "Safety Green",
  "Deep Forest"
];
const shirtSizes = ["S", "M", "L", "XL"];

let pool;
let schemaReady;
const mockMembers = [
  { id: 1, name: "Sample Puller", role: "puller" },
  { id: 2, name: "Sample Backup", role: "backup" }
];
const mockVotes = new Map();

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000
    });
  }
  return pool;
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = getPool().query(`
      CREATE TABLE IF NOT EXISTS public.${voteTable} (
        id BIGSERIAL PRIMARY KEY,
        member_id BIGINT NOT NULL UNIQUE
          REFERENCES public.${rosterTable}(id) ON DELETE CASCADE,
        puller_name TEXT NOT NULL,
        shirt_color TEXT NOT NULL CHECK (
          shirt_color IN (
            'White', 'Black', 'Graphite', 'Navy', 'Deep Royal',
            'Light Blue', 'Wow Pink', 'Deep Red', 'Safety Orange',
            'Safety Green', 'Deep Forest'
          )
        ),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS plane_pull_shirt_votes_color_idx
        ON public.${voteTable} (shirt_color);

      ALTER TABLE public.${voteTable}
        ADD COLUMN IF NOT EXISTS shirt_size TEXT;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'plane_pull_shirt_votes_size_check'
            AND conrelid = 'public.${voteTable}'::regclass
        ) THEN
          ALTER TABLE public.${voteTable}
            ADD CONSTRAINT plane_pull_shirt_votes_size_check
            CHECK (shirt_size IS NULL OR shirt_size IN ('S', 'M', 'L', 'XL'));
        END IF;
      END $$;
    `);
  }
  return schemaReady;
}

function sendJson(response, status, payload) {
  response.status(status)
    .setHeader("content-type", "application/json; charset=utf-8")
    .setHeader("cache-control", "no-store");
  response.end(JSON.stringify(payload));
}

function normalizeVote(body) {
  const memberId = Number(body.memberId);
  const name = String(body.name ?? "").trim();
  const color = String(body.color ?? "").trim();
  const size = String(body.size ?? "").trim().toUpperCase();

  if (!Number.isInteger(memberId) || memberId <= 0) {
    throw new Error("Choose your name from the team roster");
  }
  if (!name || name.length > 120) {
    throw new Error("Choose your name from the team roster");
  }
  if (!shirtColors.includes(color)) {
    throw new Error("Choose a valid shirt color");
  }
  if (!shirtSizes.includes(size)) {
    throw new Error("Choose a valid shirt size");
  }

  return { memberId, name, color, size };
}

function emptyResults() {
  return shirtColors.map((color) => ({ color, votes: 0 }));
}

function mergeResults(rows) {
  const counts = new Map(rows.map((row) => [row.color, Number(row.votes)]));
  return emptyResults().map((item) => ({
    ...item,
    votes: counts.get(item.color) || 0
  }));
}

async function readDashboard() {
  await ensureSchema();
  const votesResult = await getPool().query(`
    SELECT shirt_color AS color, count(*)::int AS votes
    FROM public.${voteTable}
    GROUP BY shirt_color
  `);

  const results = mergeResults(votesResult.rows);
  return {
    votingOpen: false,
    results,
    totalVotes: results.reduce((sum, item) => sum + item.votes, 0)
  };
}

async function saveVote(body) {
  const vote = normalizeVote(body);
  await ensureSchema();

  const result = await getPool().query(
    `
      INSERT INTO public.${voteTable} (member_id, puller_name, shirt_color, shirt_size)
      SELECT id, "Name", $3, $4
      FROM public.${rosterTable}
      WHERE id = $1 AND lower(btrim("Name")) = lower(btrim($2))
      ON CONFLICT (member_id) DO UPDATE
      SET
        puller_name = EXCLUDED.puller_name,
        shirt_color = EXCLUDED.shirt_color,
        shirt_size = EXCLUDED.shirt_size,
        updated_at = now()
      RETURNING
        member_id AS "memberId",
        puller_name AS name,
        shirt_color AS color,
        shirt_size AS size,
        updated_at AS "updatedAt"
    `,
    [vote.memberId, vote.name, vote.color, vote.size]
  );

  if (result.rowCount === 0) {
    const error = new Error("That name no longer matches the team roster");
    error.statusCode = 409;
    throw error;
  }

  const dashboard = await readDashboard();
  return { vote: result.rows[0], ...dashboard };
}

export default async function handler(request, response) {
  try {
    if (request.method === "POST") {
      return sendJson(response, 403, { error: "Voting is closed" });
    }

    if (process.env.USE_MOCK_DATA === "1") {
      return handleMock(request, response);
    }

    if (request.method === "GET") {
      return sendJson(response, 200, await readDashboard());
    }

    response.setHeader("allow", "GET");
    return sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    const status = error.statusCode || (error.message?.startsWith("Choose") ? 400 : 500);
    return sendJson(response, status, {
      error: status === 500 ? "Server error" : error.message
    });
  }
}

function handleMock(request, response) {
  if (request.method === "GET") {
    const results = mergeResults(
      shirtColors.map((color) => ({
        color,
        votes: [...mockVotes.values()].filter((vote) => vote.color === color).length
      }))
    );
    return sendJson(response, 200, {
      votingOpen: false,
      results,
      totalVotes: mockVotes.size
    });
  }

  response.setHeader("allow", "GET");
  return sendJson(response, 405, { error: "Method not allowed" });
}
