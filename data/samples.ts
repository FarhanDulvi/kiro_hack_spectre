import type { OfficialAlert } from "@/lib/types";

/** A river sensor crossing a level with no official warning yet. Perisai must hold it. */
export const SENSOR_EVENTS: OfficialAlert[] = [
  {
    id: "sensor-kelantan",
    kind: "sensor",
    source: "River sensor",
    titleBm: "Bacaan sensor: Sungai Kelantan",
    titleEn: "River sensor reading, no official warning yet",
    issued: "2026-11-15T13:05:00",
    validFrom: null,
    validTo: null,
    textBm:
      "BACAAN SENSOR: Paras air Sungai Kelantan di Jambatan Guillemard 23.9 m, melepasi paras AMARAN (23.5 m). Tiada amaran rasmi daripada JPS atau MetMalaysia setakat ini.",
    textEn: null,
    instructionBm: null,
    gauge: { river: "Sungai Kelantan", station: "Jambatan Guillemard", reading: 23.9, waspada: 22.5, amaran: 23.5, bahaya: 25 },
    sampleFacts: {
      hazard: "flood",
      severity: "amaran",
      landStates: ["Kelantan"],
      districts: { Kelantan: ["Tanah Merah"] },
      river: "Sungai Kelantan",
      station: "Jambatan Guillemard",
    },
  },
];

/** Written in the style of official alerts. Always shown with a "Sample" badge. */
export const SAMPLES: OfficialAlert[] = [
  {
    id: "sample-flood",
    kind: "sample",
    source: "JPS",
    titleBm: "Amaran Banjir",
    titleEn: "Flood warning",
    issued: "2026-11-15T11:30:00",
    validFrom: null,
    validTo: null,
    textBm:
      "AMARAN BANJIR: Paras air Sungai Klang di Jambatan Kota, Klang telah melepasi paras BAHAYA pada jam 11:30 pagi dan dijangka terus meningkat. Penduduk di kawasan rendah Klang dan Shah Alam dinasihatkan bersedia untuk berpindah ke Pusat Pemindahan Sementara (PPS) berhampiran.",
    textEn: null,
    instructionBm: "Bersedia untuk berpindah ke PPS berhampiran.",
    gauge: { river: "Sungai Klang", station: "Jambatan Kota", reading: 5.42, waspada: 4.5, amaran: 4.8, bahaya: 5.1 },
    sampleFacts: {
      hazard: "flood",
      severity: "bahaya",
      landStates: ["Selangor"],
      districts: { Selangor: ["Klang", "Shah Alam"] },
      river: "Sungai Klang",
      station: "Jambatan Kota",
    },
  },
  {
    id: "sample-pps",
    kind: "sample",
    source: "NADMA",
    titleBm: "PPS Dibuka",
    titleEn: "Relief centres open",
    issued: "2026-11-15T12:05:00",
    validFrom: null,
    validTo: null,
    textBm:
      "PPS DIBUKA: Dewan Seksyen 25 Shah Alam dan SK Taman Sri Muda kini dibuka. Bawa dokumen pengenalan, ubat-ubatan dan telefon bimbit. Jangan meredah air banjir.",
    textEn: null,
    instructionBm: "Bawa dokumen pengenalan, ubat-ubatan dan telefon bimbit. Jangan meredah air banjir.",
    sampleFacts: {
      hazard: "evacuation",
      severity: "amaran",
      landStates: ["Selangor"],
      districts: { Selangor: ["Shah Alam"] },
      places: ["Dewan Seksyen 25 Shah Alam", "SK Taman Sri Muda"],
    },
  },
  {
    id: "sample-clear",
    kind: "sample",
    source: "JPS",
    titleBm: "Kemas Kini",
    titleEn: "Update",
    issued: "2026-11-15T18:20:00",
    validFrom: null,
    validTo: null,
    textBm:
      "KEMAS KINI: Paras air Sungai Klang di Jambatan Kota telah menurun ke paras WASPADA. Amaran berpindah ditarik balik. Sila kekal berwaspada.",
    textEn: null,
    instructionBm: "Sila kekal berwaspada.",
    gauge: { river: "Sungai Klang", station: "Jambatan Kota", reading: 4.62, waspada: 4.5, amaran: 4.8, bahaya: 5.1 },
    sampleFacts: {
      hazard: "all_clear",
      severity: "waspada",
      landStates: ["Selangor"],
      districts: { Selangor: ["Klang"] },
      river: "Sungai Klang",
      station: "Jambatan Kota",
    },
  },
];
