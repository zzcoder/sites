import { databaseConfigured, ensureSchema, sql } from "../lib/neon.js";

const SHIP_ID = 447122;

function serializePosition(row) {
  if (!row) return null;
  return {
    ...row,
    id: Number(row.id),
    ship_id: Number(row.ship_id),
    ais_timestamp: new Date(row.ais_timestamp).toISOString(),
    fetched_at: new Date(row.fetched_at).toISOString(),
  };
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "GET") return response.status(405).json({ error: "Method not allowed" });
  if (!databaseConfigured()) return response.status(503).json({ error: "Database is not configured" });

  try {
    await ensureSchema();
    const db = sql();
    const [positionRows, runRows] = await Promise.all([
      db`
        SELECT id, ship_id, mmsi, imo, ship_name, latitude, longitude, speed_knots,
               course_deg, heading_deg, navigation_status, destination, eta,
               current_port, last_port, source, ais_timestamp, fetched_at
        FROM (
          SELECT * FROM where_is_chris_positions
          WHERE ship_id = ${SHIP_ID}
          ORDER BY ais_timestamp DESC, id DESC
          LIMIT 5000
        ) positions
        ORDER BY ais_timestamp ASC, id ASC
      `,
      db`
        SELECT id, ran_at, success, inserted, message
        FROM where_is_chris_collector_runs
        ORDER BY ran_at DESC, id DESC
        LIMIT 1
      `,
    ]);

    const positions = positionRows.map(serializePosition);
    const latest = positions.at(-1) || null;
    const staleAfterMinutes = Number.parseInt(process.env.STALE_AFTER_MINUTES || "20", 10);
    const stale = latest
      ? Date.now() - new Date(latest.ais_timestamp).getTime() > staleAfterMinutes * 60_000
      : false;
    let historyDays = 0;
    if (positions.length >= 2) {
      const first = new Date(positions[0].ais_timestamp);
      const last = new Date(positions.at(-1).ais_timestamp);
      historyDays = Math.max(1, Math.floor((last - first) / 86_400_000) + 1);
    }
    const collector = runRows[0]
      ? {
          ...runRows[0],
          id: Number(runRows[0].id),
          ran_at: new Date(runRows[0].ran_at).toISOString(),
        }
      : null;

    return response.status(200).json({
      ship_id: SHIP_ID,
      latest,
      positions,
      collector,
      stale,
      configured: true,
      history_days: historyDays,
      stale_after_minutes: staleAfterMinutes,
      storage: "Neon Postgres",
    });
  } catch (error) {
    console.error("Neon status query failed", error);
    return response.status(500).json({ error: "Unable to read tracker database" });
  }
}
