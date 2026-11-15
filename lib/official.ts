import { SAMPLES } from "@/data/samples";
import type { OfficialAlert } from "./types";

const FEED = "https://api.data.gov.my/weather/warning?limit=10";

type MetRecord = {
  warning_issue: { issued: string; title_bm: string; title_en: string };
  valid_from: string | null;
  valid_to: string | null;
  heading_en: string | null;
  text_en: string | null;
  instruction_en: string | null;
  heading_bm: string | null;
  text_bm: string | null;
  instruction_bm: string | null;
};

let cache: { at: number; alerts: OfficialAlert[]; ok: boolean } | null = null;

function toAlert(r: MetRecord, i: number): OfficialAlert {
  return {
    id: `met-${r.warning_issue.issued}-${i}`,
    kind: "live",
    source: "MetMalaysia",
    titleBm: r.warning_issue.title_bm,
    titleEn: r.warning_issue.title_en,
    headingEn: r.heading_en ?? undefined,
    issued: r.warning_issue.issued,
    validFrom: r.valid_from,
    validTo: r.valid_to,
    textBm: r.text_bm ?? "",
    textEn: r.text_en,
    instructionBm: r.instruction_bm,
  };
}

/** Live MetMalaysia warnings (cached for 60 s). Never throws: on failure returns []. */
export async function liveAlerts(): Promise<{ alerts: OfficialAlert[]; ok: boolean }> {
  if (cache && Date.now() - cache.at < 60_000) return cache;
  try {
    const res = await fetch(FEED, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!res.ok) throw new Error(`MetMalaysia feed returned ${res.status}`);
    const rows = (await res.json()) as MetRecord[];
    const alerts = rows
      .filter((r) => r.warning_issue?.title_en && !/no advisory/i.test(r.warning_issue.title_en))
      .map(toAlert)
      .sort((a, b) => b.issued.localeCompare(a.issued));
    cache = { at: Date.now(), alerts, ok: true };
  } catch (err) {
    console.error("[official] live feed failed:", err);
    cache = { at: Date.now(), alerts: cache?.alerts ?? [], ok: false };
  }
  return cache;
}

export async function allAlerts() {
  const live = await liveAlerts();
  return { live: live.alerts, liveOk: live.ok, samples: SAMPLES };
}
