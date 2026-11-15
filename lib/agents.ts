import { GROUPS } from "@/data/groups";
import { targetGroups } from "./compose";
import { displayState, extractFacts, fmtTime } from "./extract";
import type { Facts, OfficialAlert, WorkerGroup } from "./types";
import { verify, type Verdict } from "./verify";

/**
 * Perisai's four agents, run in order by the orchestrator. Each agent hands the
 * next a message; the trail is shown on the dashboard and returned by
 * /api/pipeline/<alertId>.
 */
export type Agent = "Watchtower" | "Auditor" | "Herald" | "Treasurer";
export const AGENTS: { name: Agent; job: string }[] = [
  { name: "Watchtower", job: "Reads MetMalaysia warnings and river sensors" },
  { name: "Auditor", job: "Scores sources; holds anything without an official source" },
  { name: "Herald", job: "Writes 6 languages, messages groups, rings sirens" },
  { name: "Treasurer", job: "Pays relief over DuitNow, once per event" },
];

export type AgentMessage = {
  step: 1 | 2 | 3 | 4;
  from: Agent;
  to: string;
  kind: string;
  text: string;
  ok: boolean;
};

export type PipelineResult = {
  facts: Facts;
  verdict: Verdict;
  targets: WorkerGroup[];
  /** Targets not already warned for this event (the Herald never sends twice). */
  fresh: WorkerGroup[];
  messages: AgentMessage[];
};

export function runPipeline(
  alert: OfficialAlert,
  all: OfficialAlert[],
  alreadyWarned: Set<string> = new Set(),
): PipelineResult {
  const facts = extractFacts(alert);
  const verdict = verify(alert, facts, all);
  const targets = targetGroups(facts, GROUPS);
  const fresh = targets.filter((g) => !alreadyWarned.has(`${alert.id}:${g.id}`));
  const where = facts.seaStates.length
    ? `sea near ${facts.seaStates.map(displayState).join(", ")}`
    : facts.landStates.map(displayState).join(", ") || "no named area";
  const messages: AgentMessage[] = [
    {
      step: 1,
      from: "Watchtower",
      to: "Auditor",
      kind: "DisasterEvent",
      ok: true,
      text: `${facts.hazard.replace(/_/g, " ")}, ${facts.severity}, ${where}. Source: ${facts.source}, ${fmtTime(facts.issued)}.`,
    },
  ];

  if (!verdict.approved) {
    messages.push({ step: 2, from: "Auditor", to: "Operator", kind: "HeldForReview", ok: false, text: `Score ${verdict.score}/100. ${verdict.reason}` });
    return { facts, verdict, targets, fresh: [], messages };
  }

  const workers = targets.reduce((n, g) => n + g.members, 0);
  messages.push({
    step: 2,
    from: "Auditor",
    to: "Herald",
    kind: "VerifiedEvent",
    ok: true,
    text: `Score ${verdict.score}/100 (${verdict.evidence.filter((e) => e.ok).map((e) => e.label.toLowerCase()).join(", ")}). Impact: ${targets.length} groups, ${workers} workers.`,
  });

  const skipped = targets.length - fresh.length;
  messages.push({
    step: 3,
    from: "Herald",
    to: "Worker groups",
    kind: "Warning",
    ok: true,
    text: fresh.length
      ? `Sent to ${fresh.map((g) => g.name).join(", ")} in ${new Set(fresh.map((g) => g.lang)).size} languages.${skipped ? ` Skipped ${skipped} already warned.` : ""}`
      : targets.length
        ? `All ${targets.length} groups were already warned for this event. Nothing re-sent.`
        : "No worker groups in the warned area. Nothing sent.",
  });
  messages.push({
    step: 4,
    from: "Herald",
    to: "Ledger",
    kind: "Record",
    ok: true,
    text: fresh.length ? `Warning recorded for ${fresh.length} groups.` : "No new sends to record.",
  });
  return { facts, verdict, targets, fresh, messages };
}
