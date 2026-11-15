import { connection } from "next/server";
import { allAlerts } from "@/lib/official";

export async function GET() {
  // Always fetch at request time: warnings change through the day.
  await connection();
  const data = await allAlerts();
  return Response.json(data, { headers: { "Cache-Control": "public, max-age=30" } });
}
