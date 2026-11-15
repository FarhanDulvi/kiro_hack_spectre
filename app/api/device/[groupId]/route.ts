import { GROUPS } from "@/data/groups";
import { PHRASES, type PhraseKey } from "@/data/phrasebook";
import { SAMPLES } from "@/data/samples";
import { extractFacts, fmtTime } from "@/lib/extract";
import { groupMatches } from "@/lib/compose";
import { liveAlerts } from "@/lib/official";
import type { Severity } from "@/lib/types";
import type { NextRequest } from "next/server";

/** What the dorm siren box does for each gauge band. */
const OUTPUT: Record<Severity | "none", { led: string; buzz: number[] }> = {
  none: { led: "#000000", buzz: [] },
  normal: { led: "#2E9E6A", buzz: [] },
  waspada: { led: "#F4C542", buzz: [200] },
  amaran: { led: "#F07F2E", buzz: [400, 200, 400] },
  bahaya: { led: "#E5484D", buzz: [800, 200, 800, 200, 800] },
};

/**
 * Polled by the siren box in a worker dormitory (see iot/dorm-siren).
 * Returns the newest official warning for this group's area, in the group's language.
 * `?sample=sample-flood` forces a built-in sample for demos.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/device/[groupId]">) {
  const { groupId } = await ctx.params;
  const group = GROUPS.find((g) => g.id === groupId);
  if (!group) {
    return Response.json(
      { error: `Unknown group "${groupId}". Use one of: ${GROUPS.map((g) => g.id).join(", ")}` },
      { status: 404 },
    );
  }

  const sampleId = req.nextUrl.searchParams.get("sample");
  const candidates = sampleId
    ? SAMPLES.filter((s) => s.id === sampleId)
    : (await liveAlerts()).alerts;
  const alert = candidates.find((a) => groupMatches(extractFacts(a), group));

  if (!alert) {
    return Response.json({
      group: group.id,
      lang: group.lang,
      level: "none",
      ...OUTPUT.none,
      headline: null,
      checked: new Date().toISOString(),
    });
  }

  const facts = extractFacts(alert);
  const phrase = PHRASES[`h_${facts.hazard}` as PhraseKey];
  return Response.json({
    group: group.id,
    lang: group.lang,
    level: facts.severity,
    ...OUTPUT[facts.severity],
    headline: phrase[group.lang],
    headline_en: phrase.en,
    alert_id: alert.id,
    source: facts.source,
    issued: fmtTime(facts.issued),
    sample: alert.kind === "sample",
    checked: new Date().toISOString(),
  });
}
