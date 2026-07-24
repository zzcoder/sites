import { ensureSchema, isDatabaseConfigured, materializePenalties } from "@/lib/db";
import { exerciseDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: false, error: "Database is not connected." }, { status: 503 });
  }

  try {
    await ensureSchema();
    const date = exerciseDate();
    await materializePenalties(date);
    return Response.json({ ok: true, exerciseDate: date });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Penalty update failed." }, { status: 500 });
  }
}
