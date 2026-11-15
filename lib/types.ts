export type Lang = "bn" | "ne" | "my" | "id" | "hi" | "ur";
export type GlossLang = Lang | "en";

export type Hazard =
  | "flood"
  | "evacuation"
  | "all_clear"
  | "strong_wind_sea"
  | "thunderstorm"
  | "heavy_rain"
  | "other";

/** Severity follows the colour bands painted on JPS river gauges. */
export type Severity = "normal" | "waspada" | "amaran" | "bahaya";

/** An official warning, either live from MetMalaysia or a built-in sample. */
/** A river-level reading from a gauge sensor (sample data, labelled as such). */
export type GaugeReading = {
  river: string;
  station: string;
  reading: number; // metres
  waspada: number;
  amaran: number;
  bahaya: number;
};

export type OfficialAlert = {
  id: string;
  /** "sensor" means a gauge reading with no official warning behind it. */
  kind: "live" | "sample" | "sensor";
  gauge?: GaugeReading;
  source: string; // e.g. "MetMalaysia"
  titleBm: string;
  titleEn: string;
  headingEn?: string;
  issued: string; // ISO local time, Malaysia (no offset)
  validFrom: string | null;
  validTo: string | null;
  textBm: string;
  textEn: string | null;
  instructionBm: string | null;
  /** Samples carry their facts explicitly; live alerts are parsed. */
  sampleFacts?: Partial<Facts>;
};

export type Facts = {
  hazard: Hazard;
  severity: Severity;
  /** States warned on land, using the state names in our boundary file. */
  landStates: string[];
  /** Districts named in the warning, keyed by state. Missing means whole state. */
  districts: Record<string, string[]>;
  /** States whose sea is warned (marine warnings). */
  seaStates: string[];
  river?: string;
  station?: string;
  /** Relief centres named in the warning, kept in their original spelling. */
  places: string[];
  issued: string;
  validFrom: string | null;
  validTo: string | null;
  source: string;
};

export type WorkerGroup = {
  id: string;
  name: string;
  community: string; // "Bangladeshi workers"
  state: string;
  district: string;
  town: string;
  lang: Lang;
  members: number;
  lat: number;
  lng: number;
};

export type MessageLine = {
  key: string;
  role: "headline" | "body" | "action" | "route" | "source";
  text: string; // in the target language
  en: string; // exact English meaning of the same phrase
  href?: string;
};

export type Message = {
  lang: Lang;
  lines: MessageLine[];
};

export type Check = { label: string; ok: boolean; detail: string };
