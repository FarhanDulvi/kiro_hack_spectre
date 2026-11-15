import { connection, type NextRequest } from "next/server";
import { listReadings, saveReading, type SensorReading } from "@/lib/sensors";
import { STATES } from "@/lib/extract";

const DEVICE_KEY = process.env.SENSOR_KEY ?? "perisai-demo";

/** Latest reading from each river-level sensor. */
export async function GET() {
  await connection();
  return Response.json({ readings: listReadings() });
}

/**
 * Called by the ESP32 river sensor every minute (see iot/river-sensor).
 * Body: { deviceId, river, station, state, district, reading, waspada, amaran, bahaya }
 * Header: x-device-key
 */
export async function POST(req: NextRequest) {
  if (req.headers.get("x-device-key") !== DEVICE_KEY) {
    return Response.json({ error: "Missing or wrong x-device-key header." }, { status: 401 });
  }
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }
  const str = (k: string) => (typeof b[k] === "string" && (b[k] as string).length <= 60 ? (b[k] as string).trim() : null);
  const num = (k: string) => (typeof b[k] === "number" && Number.isFinite(b[k]) ? (b[k] as number) : null);
  const r = {
    deviceId: str("deviceId"),
    river: str("river"),
    station: str("station"),
    state: str("state"),
    district: str("district"),
    reading: num("reading"),
    waspada: num("waspada"),
    amaran: num("amaran"),
    bahaya: num("bahaya"),
  };
  const missing = Object.entries(r).filter(([, v]) => v === null).map(([k]) => k);
  if (missing.length) return Response.json({ error: `Missing or invalid: ${missing.join(", ")}` }, { status: 400 });
  if (!STATES.includes(r.state as (typeof STATES)[number])) {
    return Response.json({ error: `state must be one of: ${STATES.join(", ")}` }, { status: 400 });
  }
  const now = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 19); // Malaysia time
  const reading = { ...(r as Omit<SensorReading, "at">), at: now };
  if (!saveReading(reading)) return Response.json({ error: "Too many devices for the demo store." }, { status: 429 });
  return Response.json({ ok: true, saved: reading });
}
