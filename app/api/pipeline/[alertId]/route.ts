import { connection, type NextRequest } from "next/server";
import { SAMPLES, SENSOR_EVENTS } from "@/data/samples";
import { runPipeline } from "@/lib/agents";
import { liveAlerts } from "@/lib/official";
import { listReadings, readingToAlert } from "@/lib/sensors";

/** Runs the four agents on one alert and returns their message trail. Read-only: nothing is sent. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/pipeline/[alertId]">) {
  await connection();
  const { alertId } = await ctx.params;
  const live = (await liveAlerts()).alerts;
  const all = [...live, ...listReadings().map(readingToAlert), ...SENSOR_EVENTS, ...SAMPLES];
  const alert = all.find((a) => a.id === alertId);
  if (!alert) {
    return Response.json({ error: `Unknown alert "${alertId}".`, known: all.map((a) => a.id) }, { status: 404 });
  }
  const { facts, verdict, targets, messages } = runPipeline(alert, all);
  return Response.json({
    alert: { id: alert.id, kind: alert.kind, title: alert.titleEn, source: alert.source, issued: alert.issued },
    facts,
    verdict,
    targets: targets.map((g) => ({ id: g.id, name: g.name, lang: g.lang, members: g.members })),
    messages,
  });
}
