"use client";

import { useEffect, useState } from "react";

/** How many official MetMalaysia warnings are active right now. */
export function LiveCount() {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/official")
      .then((r) => r.json())
      .then((d: { live: unknown[] }) => setN(d.live.length))
      .catch(() => setN(-1));
  }, []);
  if (n === null) return <span>Checking MetMalaysia…</span>;
  if (n < 0) return <span>MetMalaysia feed unreachable right now</span>;
  return (
    <span>
      <strong className="text-ink">{n}</strong> official {n === 1 ? "warning" : "warnings"} live from MetMalaysia right now
    </span>
  );
}
