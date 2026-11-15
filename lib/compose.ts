import { PHRASES, VETTED_ACTIONS, type PhraseKey } from "@/data/phrasebook";
import { displayState, fmtTime } from "./extract";
import type { Check, Facts, Lang, Message, MessageLine, WorkerGroup } from "./types";

// In right-to-left text, Latin names and times are wrapped in Unicode direction
// isolates so they keep their own order instead of being reshuffled.
const RTL: Lang[] = ["ur"];
const fill = (tpl: string, slots: Record<string, string>, isolate = false) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => {
    const v = slots[k] ?? `{${k}}`;
    return isolate ? `⁨${v}⁩` : v;
  });

function line(
  key: PhraseKey,
  role: MessageLine["role"],
  lang: Lang,
  slots: Record<string, string> = {},
  href?: string,
): MessageLine {
  const p = PHRASES[key];
  return { key, role, text: fill(p[lang], slots, RTL.includes(lang)), en: fill(p.en, slots), href };
}

export const mapLink = (place: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place}, Malaysia`)}`;

/** Areas text for one group (its own state and districts) or for the whole warning. */
export function areasText(facts: Facts, group?: WorkerGroup): string {
  const states = group ? facts.landStates.filter((s) => s === group.state) : facts.landStates;
  return states
    .map((s) => {
      const d = facts.districts[s];
      return d?.length ? `${displayState(s)} (${d.join(", ")})` : displayState(s);
    })
    .join(", ");
}

/** Build one message from vetted phrases. Names and times are copied unchanged. */
export function compose(facts: Facts, lang: Lang, group?: WorkerGroup): Message {
  const lines: MessageLine[] = [line(`h_${facts.hazard}` as PhraseKey, "headline", lang)];
  const river = { river: facts.river ?? "", station: facts.station ?? "" };

  if (facts.hazard === "flood" && facts.river) lines.push(line("b_river_danger", "body", lang, river));
  if (facts.hazard === "all_clear" && facts.river) lines.push(line("b_river_down", "body", lang, river));
  if (facts.hazard === "evacuation" && facts.places.length)
    lines.push(line("b_places_open", "body", lang, { places: facts.places.join(", ") }));
  if (facts.hazard === "strong_wind_sea")
    lines.push(line("b_sea", "body", lang, { areas: facts.seaStates.map(displayState).join(", ") }));
  else if (facts.landStates.length && facts.hazard !== "evacuation")
    lines.push(line("b_areas", "body", lang, { areas: areasText(facts, group) }));
  if (facts.validFrom && facts.validTo)
    lines.push(line("b_valid", "body", lang, { from: fmtTime(facts.validFrom), to: fmtTime(facts.validTo) }));

  for (const a of VETTED_ACTIONS[facts.hazard] ?? VETTED_ACTIONS.other) lines.push(line(a, "action", lang));
  for (const place of facts.places) lines.push(line("r_map", "route", lang, { place }, mapLink(place)));

  lines.push(line("s_source", "source", lang, { source: facts.source, time: fmtTime(facts.issued) }));
  return { lang, lines };
}

/** A group is reached when its state is warned, narrowed to districts or towns if the warning names them. */
export function groupMatches(facts: Facts, g: WorkerGroup): boolean {
  if (!facts.landStates.includes(g.state)) return false;
  const named = facts.districts[g.state];
  if (!named?.length) return true;
  const mine = [g.district, g.town].map((s) => s.toLowerCase());
  return named.some((d) => mine.includes(d.toLowerCase()));
}

export function targetGroups(facts: Facts, groups: WorkerGroup[]) {
  return groups.filter((g) => groupMatches(facts, g));
}

/** Checks run on every message before it is shown as sent. */
export function checkMessage(facts: Facts, msg: Message): Check[] {
  const all = msg.lines.map((l) => l.text).join(" ");
  const names = [facts.river, facts.station, ...facts.places].filter(Boolean) as string[];
  const kept = names.filter((n) => all.includes(n));
  const time = fmtTime(facts.issued);
  const allowed = VETTED_ACTIONS[facts.hazard] ?? VETTED_ACTIONS.other;
  const actions = msg.lines.filter((l) => l.role === "action");
  const offList = actions.filter((l) => !allowed.includes(l.key as PhraseKey));
  return [
    {
      label: "Place names unchanged",
      ok: kept.length === names.length,
      detail: names.length ? `${kept.length} of ${names.length} kept exactly` : "No named places in this warning",
    },
    { label: "Issue time kept", ok: all.includes(time), detail: time },
    { label: "Source named", ok: all.includes(facts.source), detail: facts.source },
    {
      label: "Actions from the safety list",
      ok: offList.length === 0 && actions.length > 0,
      detail: `${actions.length} of ${actions.length} vetted for ${facts.hazard.replace(/_/g, " ")}`,
    },
  ];
}
