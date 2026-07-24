import pg from "pg";
import dns from "node:dns";

const { Pool } = pg;
dns.setDefaultResultOrder("ipv4first");

const rosterTable = `"plane-pull"`;
const voteTable = "plane_pull_design_votes";
const designOptions = ["A", "B", "C", "D"];

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
        design_option TEXT NOT NULL CHECK (design_option IN ('A', 'B', 'C', 'D')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS plane_pull_design_votes_option_idx
        ON public.${voteTable} (design_option);
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
  const design = String(body.design ?? "").trim().toUpperCase();

  if (!Number.isInteger(memberId) || memberId <= 0) {
    throw new Error("Choose your name from the team roster");
  }
  if (!name || name.length > 120) {
    throw new Error("Choose your name from the team roster");
  }
  if (!designOptions.includes(design)) {
    throw new Error("Choose a valid shirt design");
  }

  return { memberId, name, design };
}

function emptyResults() {
  return designOptions.map((option) => ({ option, votes: 0 }));
}

function mergeResults(rows) {
  const counts = new Map(rows.map((row) => [row.option, Number(row.votes)]));
  return emptyResults().map((item) => ({
    ...item,
    votes: counts.get(item.option) || 0
  }));
}

async function readDashboard() {
  await ensureSchema();
  const votesResult = await getPool().query(`
    SELECT design_option AS option, count(*)::int AS votes
    FROM public.${voteTable}
    GROUP BY design_option
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
      INSERT INTO public.${voteTable} (member_id, puller_name, design_option)
      SELECT id, "Name", $3
      FROM public.${rosterTable}
      WHERE id = $1 AND lower(btrim("Name")) = lower(btrim($2))
      ON CONFLICT (member_id) DO UPDATE
      SET
        puller_name = EXCLUDED.puller_name,
        design_option = EXCLUDED.design_option,
        updated_at = now()
      RETURNING
        member_id AS "memberId",
        puller_name AS name,
        design_option AS design,
        updated_at AS "updatedAt"
    `,
    [vote.memberId, vote.name, vote.design]
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
      designOptions.map((option) => ({
        option,
        votes: [...mockVotes.values()].filter((vote) => vote.design === option).length
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
