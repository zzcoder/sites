import pg from "pg";
import dns from "node:dns";

const { Pool } = pg;
dns.setDefaultResultOrder("ipv4first");

const tableName = `"plane-pull"`;
let pool;
let schemaReady;
const mockMembers = [
  { id: 1, name: "Sample Puller", role: "puller", donation: 100, comment: "Mock local data" },
  { id: 2, name: "Sample Backup", role: "backup", donation: 50, comment: "Mock local data" }
];

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
      CREATE TABLE IF NOT EXISTS public.${tableName} (
        id BIGSERIAL PRIMARY KEY,
        "Name" TEXT NOT NULL,
        "Role" TEXT NOT NULL CHECK ("Role" IN ('puller', 'backup')),
        "Donation" NUMERIC(10, 2) NOT NULL DEFAULT 0,
        "Comment" TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS plane_pull_role_name_idx
        ON public.${tableName} ("Role", lower("Name"));
    `);
  }
  return schemaReady;
}

function sendJson(response, status, payload) {
  response.status(status).setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function normalizeMember(body) {
  const name = String(body.name ?? "").trim();
  const role = String(body.role ?? "").trim().toLowerCase();
  const donationNumber = Number(body.donation ?? 0);
  const comment = String(body.comment ?? "").trim();

  if (!name) {
    throw new Error("Name is required");
  }
  if (!["puller", "backup"].includes(role)) {
    throw new Error("Role must be puller or backup");
  }
  if (!Number.isFinite(donationNumber) || donationNumber < 0) {
    throw new Error("Donation must be a non-negative number");
  }

  return {
    name,
    role,
    donation: Math.round(donationNumber * 100) / 100,
    comment
  };
}

function requireAdmin(request) {
  const submitted = request.headers["x-admin-password"] || request.body?.password;
  if (!process.env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD is not configured");
  }
  if (submitted !== process.env.ADMIN_PASSWORD) {
    const error = new Error("Invalid admin password");
    error.statusCode = 401;
    throw error;
  }
}

async function readMembers() {
  await ensureSchema();
  const result = await getPool().query(`
    SELECT
      id,
      "Name" AS name,
      "Role" AS role,
      "Donation"::float AS donation,
      "Comment" AS comment,
      created_at,
      updated_at
    FROM public.${tableName}
    ORDER BY
      CASE "Role" WHEN 'puller' THEN 0 ELSE 1 END,
      lower("Name"),
      id
  `);
  return result.rows;
}

async function createMember(body) {
  const member = normalizeMember(body);
  const result = await getPool().query(
    `
      INSERT INTO public.${tableName} ("Name", "Role", "Donation", "Comment", updated_at)
      VALUES ($1, $2, $3, $4, now())
      RETURNING
        id,
        "Name" AS name,
        "Role" AS role,
        "Donation"::float AS donation,
        "Comment" AS comment,
        created_at,
        updated_at
    `,
    [member.name, member.role, member.donation, member.comment]
  );
  return result.rows[0];
}

async function updateMember(body) {
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Valid id is required");
  }
  const member = normalizeMember(body);
  const result = await getPool().query(
    `
      UPDATE public.${tableName}
      SET "Name" = $1, "Role" = $2, "Donation" = $3, "Comment" = $4, updated_at = now()
      WHERE id = $5
      RETURNING
        id,
        "Name" AS name,
        "Role" AS role,
        "Donation"::float AS donation,
        "Comment" AS comment,
        created_at,
        updated_at
    `,
    [member.name, member.role, member.donation, member.comment, id]
  );
  if (result.rowCount === 0) {
    const error = new Error("Member not found");
    error.statusCode = 404;
    throw error;
  }
  return result.rows[0];
}

async function deleteMember(body) {
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Valid id is required");
  }
  const result = await getPool().query(`DELETE FROM public.${tableName} WHERE id = $1`, [id]);
  if (result.rowCount === 0) {
    const error = new Error("Member not found");
    error.statusCode = 404;
    throw error;
  }
}

export default async function handler(request, response) {
  try {
    if (process.env.USE_MOCK_DATA === "1") {
      return handleMock(request, response);
    }

    if (request.method === "GET") {
      const members = await readMembers();
      return sendJson(response, 200, { members });
    }

    if (request.method !== "POST") {
      response.setHeader("allow", "GET, POST");
      return sendJson(response, 405, { error: "Method not allowed" });
    }

    requireAdmin(request);
    await ensureSchema();

    const action = String(request.body?.action ?? "").toLowerCase();
    if (action === "create") {
      const member = await createMember(request.body);
      return sendJson(response, 201, { member });
    }
    if (action === "update") {
      const member = await updateMember(request.body);
      return sendJson(response, 200, { member });
    }
    if (action === "delete") {
      await deleteMember(request.body);
      return sendJson(response, 200, { ok: true });
    }

    return sendJson(response, 400, { error: "Unsupported action" });
  } catch (error) {
    console.error(error);
    const status = error.statusCode || 500;
    return sendJson(response, status, {
      error: status === 500 ? "Server error" : error.message
    });
  }
}

function handleMock(request, response) {
  if (request.method === "GET") {
    return sendJson(response, 200, { members: mockMembers });
  }
  requireAdmin(request);
  const action = String(request.body?.action ?? "").toLowerCase();
  if (action === "create") {
    const member = { id: Date.now(), ...normalizeMember(request.body) };
    mockMembers.push(member);
    return sendJson(response, 201, { member });
  }
  if (action === "update") {
    const id = Number(request.body.id);
    const index = mockMembers.findIndex((member) => member.id === id);
    if (index === -1) {
      return sendJson(response, 404, { error: "Member not found" });
    }
    mockMembers[index] = { ...mockMembers[index], ...normalizeMember(request.body) };
    return sendJson(response, 200, { member: mockMembers[index] });
  }
  if (action === "delete") {
    const id = Number(request.body.id);
    const index = mockMembers.findIndex((member) => member.id === id);
    if (index === -1) {
      return sendJson(response, 404, { error: "Member not found" });
    }
    mockMembers.splice(index, 1);
    return sendJson(response, 200, { ok: true });
  }
  return sendJson(response, 400, { error: "Unsupported action" });
}
