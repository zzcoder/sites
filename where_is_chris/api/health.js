import { databaseConfigured, ensureSchema, sql } from "../lib/neon.js";

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "GET") return response.status(405).json({ error: "Method not allowed" });
  if (!databaseConfigured()) return response.status(503).json({ ok: false, database: "not configured" });
  try {
    await ensureSchema();
    const db = sql();
    await db`SELECT 1`;
    return response.status(200).json({ ok: true, database: "Neon Postgres" });
  } catch (error) {
    console.error("Neon health query failed", error);
    return response.status(500).json({ ok: false, database: "unavailable" });
  }
}
