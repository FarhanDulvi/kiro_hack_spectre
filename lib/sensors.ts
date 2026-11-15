import type { GaugeReading, OfficialAlert } from "./types";
import { gaugeBand } from "./verify";

/** A reading posted by an ESP32 river-level sensor (see iot/river-sensor). */
export type SensorReading = GaugeReading & {
  deviceId: string;
  state: string;
  district: string;
  at: string; // ISO local time
};

// In-memory store: fine for a single demo instance; a real deployment uses a database.
const readings = new Map<string, SensorReading>();
const MAX_DEVICES = 50;

export function saveReading(r: SensorReading) {
  if (!readings.has(r.deviceId) && readings.size >= MAX_DEVICES) return false;
  readings.set(r.deviceId, r);
  return true;
}

export const listReadings = () => [...readings.values()].sort((a, b) => b.at.localeCompare(a.at));

/** Watchtower: a reading becomes a sensor event, unverified until an official source agrees. */
export function readingToAlert(r: SensorReading): OfficialAlert {
  const band = gaugeBand(r);
  const label = { normal: "NORMAL", waspada: "WASPADA", amaran: "AMARAN", bahaya: "BAHAYA" }[band];
  return {
    id: `device-${r.deviceId}-${r.at}`,
    kind: "sensor",
    source: `River sensor ${r.deviceId}`,
    titleBm: `Bacaan sensor: ${r.river}`,
    titleEn: "Live river sensor reading, no official warning yet",
    issued: r.at,
    validFrom: null,
    validTo: null,
    textBm: `BACAAN SENSOR: Paras air ${r.river} di ${r.station} ${r.reading.toFixed(2)} m, paras ${label} (amaran ${r.amaran} m, bahaya ${r.bahaya} m).`,
    textEn: null,
    instructionBm: null,
    gauge: r,
    sampleFacts: {
      hazard: "flood",
      severity: band === "normal" ? "waspada" : band,
      landStates: [r.state],
      districts: { [r.state]: [r.district] },
      river: r.river,
      station: r.station,
    },
  };
}
