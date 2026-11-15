"use client";

import { geoArea, geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from "geojson";
import { useEffect, useMemo, useState } from "react";
import { SEVERITY } from "@/lib/severity";
import type { Facts, WorkerGroup } from "@/lib/types";

type StateFeature = Feature<MultiPolygon, { state: string }>;

const W = 560;
const H = 470;
const BORNEO = ["Sabah", "Sarawak", "W.P. Labuan"];
const INSET = { x: 12, y: 222, w: 220, h: 236 };
const VALLEY: [Position, Position] = [[101.36, 2.97], [101.66, 3.16]];

/** Hand-placed labels in the Klang Valley close-up so neighbouring pins never collide. */
const INSET_LABEL: Record<string, { dx: number; dy: number; anchor: "start" | "middle" | "end" }> = {
  "pelabuhan-klang": { dx: 8, dy: 4, anchor: "start" },
  "kilang-klang": { dx: 0, dy: -10, anchor: "middle" },
  "tapak-shah-alam": { dx: 0, dy: -10, anchor: "middle" },
  "kilang-seksyen-26": { dx: 0, dy: 18, anchor: "middle" },
  "restoran-pj": { dx: -8, dy: 4, anchor: "end" },
};

/** d3 expects clockwise rings; flip any polygon that came in the other way. */
function rewind(f: Feature<Polygon | MultiPolygon, { state: string }>): StateFeature {
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  const fixed = polys.map((rings) =>
    geoArea({ type: "Polygon", coordinates: rings }) > 2 * Math.PI ? rings.map((r) => [...r].reverse()) : rings,
  );
  return { ...f, geometry: { type: "MultiPolygon", coordinates: fixed } };
}

export function MapView({
  facts,
  groups,
  reached,
}: {
  facts: Facts | null;
  groups: WorkerGroup[];
  reached: Set<string>;
}) {
  const [states, setStates] = useState<StateFeature[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/geo/states.json")
      .then((r) => r.json())
      .then((fc: FeatureCollection<Polygon | MultiPolygon, { state: string }>) =>
        setStates(fc.features.filter((f) => !BORNEO.includes(f.properties.state)).map(rewind)),
      )
      .catch(() => setFailed(true));
  }, []);

  const geo = useMemo(() => {
    if (!states) return null;
    const fc = { type: "FeatureCollection", features: states } as FeatureCollection;
    const main = geoMercator().fitExtent([[150, 10], [W - 10, H - 10]], fc);
    const inset = geoMercator().fitExtent(
      [[INSET.x + 8, INSET.y + 30], [INSET.x + INSET.w - 8, INSET.y + INSET.h - 8]],
      { type: "MultiPoint", coordinates: VALLEY },
    );
    return { main, inset, mainPath: geoPath(main), insetPath: geoPath(inset) };
  }, [states]);

  const sev = facts ? SEVERITY[facts.severity] : null;
  const land = new Set(facts?.landStates ?? []);
  const sea = new Set(facts?.seaStates ?? []);

  if (failed) {
    return <p className="p-6 text-sm text-mist-dim">The state map could not load. Targeting still works: see the groups list.</p>;
  }
  if (!geo || !states) {
    return <div className="aspect-[56/47] w-full animate-pulse rounded-lg bg-deep" aria-label="Loading map" />;
  }

  const [vx0, vy0] = geo.main(VALLEY[0] as [number, number])!;
  const [vx1, vy1] = geo.main(VALLEY[1] as [number, number])!;

  const statePaths = (path: typeof geo.mainPath, keyPrefix: string) => (
    <>
      {/* Marine warnings: a band of colour along the warned coastline. */}
      {states
        .filter((s) => sea.has(s.properties.state))
        .map((s) => (
          <path
            key={`${keyPrefix}-sea-${s.properties.state}`}
            d={path(s) ?? ""}
            fill="none"
            stroke={sev?.color}
            strokeOpacity={0.55}
            strokeWidth={10}
            strokeLinejoin="round"
          />
        ))}
      {states.map((s) => {
        const warned = land.has(s.properties.state);
        return (
          <path
            key={`${keyPrefix}-${s.properties.state}`}
            d={path(s) ?? ""}
            fill={warned ? sev?.color : "#e4dfd4"}
            fillOpacity={warned ? 0.34 : 1}
            stroke={warned ? sev?.color : "#f3f0ea"}
            strokeWidth={warned ? 1.2 : 0.8}
          >
            <title>{s.properties.state}</title>
          </path>
        );
      })}
    </>
  );

  const pin = (g: WorkerGroup, proj: typeof geo.main, r: number, label: boolean, inInset: boolean) => {
    const [x, y] = proj([g.lng, g.lat])!;
    const hit = reached.has(g.id);
    const place = inInset
      ? INSET_LABEL[g.id] ?? { dx: 8, dy: 4, anchor: "start" as const }
      : x > W - 120
        ? { dx: -8, dy: 4, anchor: "end" as const }
        : { dx: 8, dy: 4, anchor: "start" as const };
    return (
      <g key={`${inInset ? "i" : "m"}-${g.id}`}>
        {hit && <circle cx={x} cy={y} r={6} fill="none" stroke={sev?.color} strokeWidth={2} className="pin-ripple" />}
        <circle cx={x} cy={y} r={r} fill={hit ? sev?.color : "#a39e93"} stroke="#ffffff" strokeWidth={1.5}>
          <title>{`${g.name}: ${g.community}, ${g.members} members${hit ? " (reached)" : ""}`}</title>
        </circle>
        {label && (
          <text
            x={x + place.dx}
            y={y + place.dy}
            textAnchor={place.anchor}
            fontSize={11}
            fill={hit ? "#111111" : "#6b675f"}
            fontWeight={hit ? 700 : 400}
            paintOrder="stroke"
            stroke="#faf8f4"
            strokeWidth={3}
          >
            {g.name}
          </text>
        )}
      </g>
    );
  };

  const valley = groups.filter(
    (g) => g.lng >= VALLEY[0][0] && g.lng <= VALLEY[1][0] && g.lat >= VALLEY[0][1] && g.lat <= VALLEY[1][1],
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Map of Peninsular Malaysia showing warned states and worker groups">
      <defs>
        <clipPath id="inset-clip">
          <rect x={INSET.x} y={INSET.y} width={INSET.w} height={INSET.h} rx={10} />
        </clipPath>
      </defs>

      {statePaths(geo.mainPath, "m")}
      {groups.map((g) => pin(g, geo.main, valley.includes(g) ? 3 : 5, !valley.includes(g), false))}

      {/* Klang Valley close-up, where most demo groups are. */}
      <rect x={vx0 - 3} y={vy1 - 3} width={vx1 - vx0 + 6} height={vy0 - vy1 + 6} fill="none" stroke="#6b675f" strokeWidth={1} />
      <line x1={vx0 - 3} y1={vy0 + 3} x2={INSET.x + INSET.w} y2={INSET.y} stroke="#6b675f" strokeWidth={0.75} strokeDasharray="3 3" />
      <rect x={INSET.x} y={INSET.y} width={INSET.w} height={INSET.h} rx={10} fill="#faf8f4" stroke="#dcd7cc" />
      <g clipPath="url(#inset-clip)">
        {statePaths(geo.insetPath, "i")}
        {valley.map((g) => pin(g, geo.inset, 5, true, true))}
      </g>
      <text x={INSET.x + 10} y={INSET.y + 19} fontSize={12} fontWeight={700} fill="#111111">
        Klang Valley
      </text>
    </svg>
  );
}
