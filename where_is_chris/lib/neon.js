import postgres from "postgres";

let client;
let schemaPromise;

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function sql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
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

export async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = createSchema().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

async function createSchema() {
  await sql().unsafe(`
    CREATE TABLE IF NOT EXISTS where_is_chris_positions (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      origin_position_id BIGINT UNIQUE,
      ship_id BIGINT NOT NULL,
      mmsi TEXT,
      imo TEXT,
      ship_name TEXT,
      latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
      longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
      speed_knots DOUBLE PRECISION CHECK (speed_knots IS NULL OR speed_knots >= 0),
      course_deg DOUBLE PRECISION CHECK (course_deg IS NULL OR course_deg BETWEEN 0 AND 360),
      heading_deg DOUBLE PRECISION CHECK (heading_deg IS NULL OR heading_deg BETWEEN 0 AND 360),
      navigation_status TEXT,
      destination TEXT,
      eta TEXT,
      current_port TEXT,
      last_port TEXT,
      source TEXT NOT NULL,
      ais_timestamp TIMESTAMPTZ NOT NULL,
      fetched_at TIMESTAMPTZ NOT NULL,
      raw_json JSONB NOT NULL,
      UNIQUE (ship_id, ais_timestamp, latitude, longitude)
    );
    CREATE INDEX IF NOT EXISTS where_is_chris_positions_ship_time_idx
      ON where_is_chris_positions (ship_id, ais_timestamp DESC, id DESC);

    CREATE TABLE IF NOT EXISTS where_is_chris_collector_runs (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      origin_run_id BIGINT UNIQUE,
      ran_at TIMESTAMPTZ NOT NULL,
      success BOOLEAN NOT NULL,
      inserted BOOLEAN NOT NULL DEFAULT FALSE,
      message TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS where_is_chris_collector_runs_time_idx
      ON where_is_chris_collector_runs (ran_at DESC, id DESC);
  `);
}
