const pledgeTableSql = `
  CREATE TABLE IF NOT EXISTS pledges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

const pledgeCreatedAtIndexSql = `
  CREATE INDEX IF NOT EXISTS pledges_created_at_idx
  ON pledges (created_at DESC, id DESC)
`;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function ensurePledgeSchema(db) {
  await db.batch([
    db.prepare(pledgeTableSql),
    db.prepare(pledgeCreatedAtIndexSql),
  ]);
}

async function readPledgeSummary(db) {
  const summary = await db.prepare(`
    SELECT
      COALESCE(SUM(amount_cents), 0) AS total_cents,
      COUNT(*) AS pledge_count
    FROM pledges
  `).first();
  const recent = await db.prepare(`
    SELECT id, name, amount_cents, created_at
    FROM pledges
    ORDER BY created_at DESC, id DESC
    LIMIT 10
  `).all();

  return {
    totalCents: Number(summary?.total_cents || 0),
    pledgeCount: Number(summary?.pledge_count || 0),
    recentPledges: (recent.results || []).map((pledge) => ({
      id: Number(pledge.id),
      name: String(pledge.name),
      amountCents: Number(pledge.amount_cents),
      createdAt: String(pledge.created_at),
    })),
  };
}

function normalizePledge(body) {
  const name = String(body?.name || "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
  const amount = Number(body?.amount);

  if (body?.website) {
    return { spam: true };
  }
  if (!name || [...name].length > 80) {
    return { error: "Enter a name between 1 and 80 characters." };
  }
  if (!Number.isFinite(amount) || amount < 1 || amount > 1000000) {
    return { error: "Enter a pledge amount from $1 to $1,000,000." };
  }

  return {
    name,
    amountCents: Math.round(amount * 100),
  };
}

async function handlePledges(request, env) {
  if (!env.DB) {
    return jsonResponse({ error: "Pledge storage is unavailable." }, 503);
  }

  await ensurePledgeSchema(env.DB);

  if (request.method === "GET") {
    return jsonResponse(await readPledgeSummary(env.DB));
  }

  if (request.method !== "POST") {
    return new Response(null, {
      status: 405,
      headers: {
        Allow: "GET, POST",
      },
    });
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 4096) {
    return jsonResponse({ error: "Pledge details are too large." }, 413);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Send valid pledge details." }, 400);
  }

  const pledge = normalizePledge(body);
  if (pledge.spam) {
    return jsonResponse(await readPledgeSummary(env.DB));
  }
  if (pledge.error) {
    return jsonResponse({ error: pledge.error }, 400);
  }

  const inserted = await env.DB.prepare(`
    INSERT INTO pledges (name, amount_cents)
    VALUES (?, ?)
    RETURNING id, name, amount_cents, created_at
  `).bind(pledge.name, pledge.amountCents).first();
  const summary = await readPledgeSummary(env.DB);

  return jsonResponse({
    ...summary,
    pledge: {
      id: Number(inserted.id),
      name: String(inserted.name),
      amountCents: Number(inserted.amount_cents),
      createdAt: String(inserted.created_at),
    },
  }, 201);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/pledges") {
      try {
        return await handlePledges(request, env);
      } catch (error) {
        console.error("Pledge API error", error);
        return jsonResponse({ error: "The pledge service is temporarily unavailable." }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  },
};
