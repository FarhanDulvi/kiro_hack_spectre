import { displayState, extractFacts, fmtTime } from "./extract";
import type { Facts, GaugeReading, OfficialAlert, Severity } from "./types";

export type Evidence = { label: string; detail: string; points: number; ok: boolean };

export type Verdict = {
  score: number; // 0 to 100
  approved: boolean;
  evidence: Evidence[];
  reason: string;
};

export function gaugeBand(g: GaugeReading): Severity {
  if (g.reading >= g.bahaya) return "bahaya";
  if (g.reading >= g.amaran) return "amaran";
  if (g.reading >= g.waspada) return "waspada";
  return "normal";
}

const RANK: Record<Severity, number> = { normal: 0, waspada: 1, amaran: 2, bahaya: 3 };

/**
 * The verify step. Confidence comes from independent sources agreeing.
 * Rule that never bends: without an official source, nothing is sent.
 */
export function verify(alert: OfficialAlert, facts: Facts, others: OfficialAlert[]): Verdict {
  const evidence: Evidence[] = [];
  const official = alert.kind !== "sensor";

  evidence.push({
    label: "Official source",
    ok: official,
    points: official ? 60 : 0,
    detail: official ? `${facts.source}, issued ${fmtTime(facts.issued)}` : "None yet. JPS and MetMalaysia have not issued a warning",
  });

  if (alert.gauge) {
    const band = gaugeBand(alert.gauge);
    const agrees =
      facts.hazard === "all_clear" ? RANK[band] <= RANK.waspada : RANK[band] >= RANK[facts.severity] - 1 && band !== "normal";
    evidence.push({
      label: "River sensor",
      ok: agrees,
      points: agrees ? 25 : 0,
      detail: `${alert.gauge.river} at ${alert.gauge.station}: ${alert.gauge.reading.toFixed(2)} m (${band} level)`,
    });
  }

  const support = others.find((o) => {
    if (o.id === alert.id || o.kind !== "live") return false;
    const f = extractFacts(o);
    return f.landStates.some((s) => facts.landStates.includes(s));
  });
  if (facts.landStates.length) {
    const shared = support ? extractFacts(support).landStates.find((s) => facts.landStates.includes(s)) : null;
    evidence.push({
      label: "Weather warning nearby",
      ok: !!support,
      points: support ? 15 : 0,
      detail: support
        ? `MetMalaysia ${support.titleEn.toLowerCase()} also covers ${displayState(shared!)}`
        : "No other live weather warning covers this area",
    });
  }

  const score = Math.min(100, evidence.reduce((n, e) => n + e.points, 0));
  return {
    score,
    approved: official,
    evidence,
    reason: official
      ? `Approved: an official source issued this warning${score > 60 ? " and other sources agree" : ""}.`
      : "Held for a person to review. Perisai never sends a warning without an official source.",
  };
}
