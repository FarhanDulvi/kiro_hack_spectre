import type { Facts, Hazard, OfficialAlert, Severity } from "./types";

/** State names exactly as they appear in public/geo/states.json. */
export const STATES = [
  "Perlis", "Kedah", "Pulau Pinang", "Perak", "Selangor", "W.P. Kuala Lumpur",
  "W.P. Putrajaya", "Negeri Sembilan", "Melaka", "Johor", "Pahang", "Terengganu",
  "Kelantan", "Sarawak", "Sabah", "W.P. Labuan",
] as const;

/** How MetMalaysia writes each state, in English and Malay. Longest first. */
const ALIASES: [string, string][] = (
  [
    ["W.P. Kuala Lumpur", "W.P. Kuala Lumpur"],
    ["W.P. Putrajaya", "W.P. Putrajaya"],
    ["W.P. Labuan", "W.P. Labuan"],
    ["Negeri Sembilan", "Negeri Sembilan"],
    ["N. Sembilan", "Negeri Sembilan"],
    ["Pulau Pinang", "Pulau Pinang"],
    ["Penang", "Pulau Pinang"],
    ["Kuala Lumpur", "W.P. Kuala Lumpur"],
    ["Putrajaya", "W.P. Putrajaya"],
    ["Labuan", "W.P. Labuan"],
    ["Western Sabah", "Sabah"],
    ["Eastern Sabah", "Sabah"],
    ["Sabah Barat", "Sabah"],
    ["Sabah Timur", "Sabah"],
    ["Terengganu", "Terengganu"],
    ["Selangor", "Selangor"],
    ["Kelantan", "Kelantan"],
    ["Sarawak", "Sarawak"],
    ["Pahang", "Pahang"],
    ["Perlis", "Perlis"],
    ["Melaka", "Melaka"],
    ["Johor", "Johor"],
    ["Kedah", "Kedah"],
    ["Perak", "Perak"],
    ["Sabah", "Sabah"],
  ] as [string, string][]
).sort((a, b) => b[0].length - a[0].length);

export const displayState = (s: string) => s.replace(/^W\.P\. /, "");

function statesIn(text: string): string[] {
  const found = new Set<string>();
  for (const [alias, state] of ALIASES) {
    if (new RegExp(`\\b${alias.replace(/\./g, "\\.")}\\b`, "i").test(text)) found.add(state);
  }
  return STATES.filter((s) => found.has(s));
}

/** "Kedah (Langkawi, Sik and Baling)" -> ["Langkawi", "Sik", "Baling"] */
function splitNames(list: string): string[] {
  return list
    .replace(/[()]/g, ",")
    .split(/,| and | dan /)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Land warnings list areas as "State (district, district and district) • State • ...".
 * Returns warned states and, where named, their districts.
 */
function parseLandAreas(text: string) {
  const start = text.search(/states of|negeri /i);
  let body = start >= 0 ? text.slice(start).replace(/^(states of|negeri)\s*/i, "") : text;
  body = body.split(/\s(until|sehingga)\s/i)[0];
  const landStates: string[] = [];
  const districts: Record<string, string[]> = {};
  for (const raw of body.split("•")) {
    const seg = raw.trim();
    const hit = ALIASES.find(([alias]) => seg.toLowerCase().startsWith(alias.toLowerCase()));
    if (!hit) continue;
    const [alias, state] = hit;
    if (!landStates.includes(state)) landStates.push(state);
    const rest = seg.slice(alias.length).replace(/^\s*:/, "").trim();
    if (rest) districts[state] = [...(districts[state] ?? []), ...splitNames(rest)];
  }
  return { landStates, districts };
}

function hazardOf(a: OfficialAlert): Hazard {
  const t = `${a.titleEn} ${a.titleBm}`.toLowerCase();
  if (/sea|laut/.test(t)) return "strong_wind_sea";
  if (/thunder|ribut petir/.test(t)) return "thunderstorm";
  if (/rain|hujan/.test(t)) return "heavy_rain";
  if (/flood|banjir/.test(t)) return "flood";
  return "other";
}

function severityOf(a: OfficialAlert, hazard: Hazard): Severity {
  const h = `${a.headingEn ?? ""} ${a.titleEn}`.toUpperCase();
  if (/THIRD CATEGORY|DANGER|SEVERE|BAHAYA/.test(h)) return "bahaya";
  if (/FIRST CATEGORY|ALERT LEVEL|WASPADA/.test(h)) return "waspada";
  if (/SECOND CATEGORY|WARNING LEVEL|BAD WEATHER/.test(h)) return "amaran";
  return hazard === "other" ? "waspada" : "amaran";
}

/** Pull the facts out of an official warning. Rule-based: no AI, no guessing. */
export function extractFacts(a: OfficialAlert): Facts {
  const base: Facts = {
    hazard: "other",
    severity: "waspada",
    landStates: [],
    districts: {},
    seaStates: [],
    places: [],
    issued: a.issued,
    validFrom: a.validFrom,
    validTo: a.validTo,
    source: a.source,
  };
  if (a.sampleFacts) return { ...base, ...a.sampleFacts };

  const hazard = hazardOf(a);
  const text = a.textEn ?? a.textBm;
  const facts: Facts = { ...base, hazard, severity: severityOf(a, hazard) };

  if (hazard === "strong_wind_sea" || /MALAYSIAN WATERS|PERAIRAN MALAYSIA/i.test(text)) {
    // Marine warnings name states only to say whose waters are affected.
    facts.hazard = "strong_wind_sea";
    facts.seaStates = statesIn(text);
    return facts;
  }
  const land = parseLandAreas(text);
  facts.landStates = land.landStates.length ? land.landStates : statesIn(text);
  facts.districts = land.districts;
  return facts;
}

/** "2026-11-15T12:40:00" -> "15/11/2026 12:40". Digits stay in Latin script on purpose. */
export function fmtTime(iso: string | null): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`;
}
