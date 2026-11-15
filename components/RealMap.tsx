"use client";

import "leaflet/dist/leaflet.css";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type * as L from "leaflet";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { langInfo } from "@/data/languages";
import { mapLink } from "@/lib/compose";
import type { Facts, GaugeReading, Severity, WorkerGroup } from "@/lib/types";
import { gaugeBand } from "@/lib/verify";

const HEX: Record<Severity, string> = { normal: "#2e9e6a", waspada: "#f2b632", amaran: "#ef7a26", bahaya: "#e5484d" };
const PENINSULA: [[number, number], [number, number]] = [[1.2, 99.6], [6.8, 104.6]];

/** Named places that are towns, not districts: shown as a circle. */
const TOWNS: Record<string, [number, number]> = { "shah alam": [3.0733, 101.5185] };
/** Approximate positions for the sample stations and relief centres. */
const STATIONS: Record<string, [number, number]> = {
  "Jambatan Kota": [3.0447, 101.448],
  "Jambatan Guillemard": [5.766, 102.15],
};
const PLACES: Record<string, [number, number]> = {
  "Dewan Seksyen 25 Shah Alam": [3.022, 101.54],
  "SK Taman Sri Muda": [3.0286, 101.5346],
};

type StateFC = FeatureCollection<Polygon | MultiPolygon, { state: string }>;
type DistrictFC = FeatureCollection<Polygon | MultiPolygon, { state: string; district: string }>;

/** MetMalaysia writes "Hulu Langat"; the boundary file writes "Ulu Langat". */
const norm = (s: string) => s.toLowerCase().replace(/^hulu /, "ulu ").replace("timor laut", "timur laut").trim();
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/**
 * A real, zoomable map. Shades the warned states and districts, flies to them,
 * and shows worker groups, relief centres and the river sensor as pins.
 * If the map tiles cannot load, it shows `fallback` instead.
 */
export function RealMap({
  facts,
  groups,
  reached,
  gauge,
  fallback,
}: {
  facts: Facts | null;
  groups: WorkerGroup[];
  reached: Set<string>;
  gauge: GaugeReading | null;
  fallback: ReactNode;
}) {
  const el = useRef<HTMLDivElement>(null);
  const leaf = useRef<typeof L | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlay = useRef<L.LayerGroup | null>(null);
  const statesRef = useRef<StateFC | null>(null);
  const districtsRef = useRef<DistrictFC | null>(null);
  const lastView = useRef("");
  const [ready, setReady] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let dead = false;
    let map: L.Map | null = null;
    import("leaflet")
      .then((mod) => {
        if (dead || !el.current) return;
        const Lf = ((mod as { default?: typeof L }).default ?? mod) as typeof L;
        leaf.current = Lf;
        map = Lf.map(el.current, { scrollWheelZoom: false, zoomSnap: 0.25 }).fitBounds(PENINSULA);
        let loaded = 0;
        let errors = 0;
        Lf.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18,
        })
          .on("tileload", () => {
            loaded++;
          })
          .on("tileerror", () => {
            errors++;
            if (!loaded && errors >= 4) setFailed(true);
          })
          .addTo(map);
        overlay.current = Lf.layerGroup().addTo(map);
        mapRef.current = map;
        setReady((n) => n + 1);
      })
      .catch(() => setFailed(true));

    const load = (url: string, into: { current: unknown }) =>
      fetch(url)
        .then((r) => r.json())
        .then((d) => {
          if (dead) return;
          into.current = d;
          setReady((n) => n + 1);
        })
        .catch(() => {});
    load("/geo/states.json", statesRef);
    load("/geo/districts.json", districtsRef);

    return () => {
      dead = true;
      map?.remove();
      mapRef.current = null;
      overlay.current = null;
    };
  }, []);

  useEffect(() => {
    if (!failed) return;
    mapRef.current?.remove();
    mapRef.current = null;
  }, [failed]);

  useEffect(() => {
    const Lf = leaf.current;
    const map = mapRef.current;
    const layer = overlay.current;
    if (!Lf || !map || !layer) return;
    layer.clearLayers();
    const color = facts ? HEX[facts.severity] : "#8a857a";
    const focus: L.LatLngBounds[] = [];

    if (facts) {
      const sea = new Set(facts.seaStates);
      for (const f of statesRef.current?.features ?? []) {
        const s = f.properties.state;
        const named = (facts.districts[s] ?? []).map(norm);
        if (sea.has(s)) {
          // Marine warning: a band of colour along the warned coastline.
          const g = Lf.geoJSON(f, { interactive: false, style: { color, weight: 9, opacity: 0.45, fill: false } }).addTo(layer);
          focus.push(g.getBounds());
        } else if (facts.landStates.includes(s)) {
          const whole = named.length === 0;
          const g = Lf.geoJSON(f, {
            interactive: false,
            style: { color, weight: whole ? 2 : 1.5, dashArray: whole ? undefined : "6 6", fillColor: color, fillOpacity: whole ? 0.28 : 0.05 },
          }).addTo(layer);
          let shown = whole;
          if (whole) focus.push(g.getBounds());
          for (const d of districtsRef.current?.features ?? []) {
            if (d.properties.state !== s || !named.includes(norm(d.properties.district))) continue;
            const dg = Lf.geoJSON(d, { style: { color, weight: 2, fillColor: color, fillOpacity: 0.36 } })
              .bindTooltip(`${d.properties.district}, ${s}`, { sticky: true })
              .addTo(layer);
            focus.push(dg.getBounds());
            shown = true;
          }
          for (const n of named) {
            const town = TOWNS[n];
            if (!town) continue;
            const c = Lf.circle(town, { radius: 5500, color, weight: 2, fillColor: color, fillOpacity: 0.36 }).addTo(layer);
            focus.push(c.getBounds());
            shown = true;
          }
          if (!shown) focus.push(g.getBounds());
        }
      }

      for (const place of facts.places) {
        const at = PLACES[place];
        if (!at) continue;
        Lf.marker(at, {
          title: place,
          zIndexOffset: 800,
          icon: Lf.divIcon({ className: "", iconSize: [36, 22], iconAnchor: [18, 11], html: '<span class="map-pps">PPS</span>' }),
        })
          .bindPopup(
            `<strong>${esc(place)}</strong><br>Relief centre, approximate location<br><a href="${mapLink(place)}" target="_blank" rel="noreferrer">Get directions</a>`,
          )
          .addTo(layer);
        focus.push(Lf.latLngBounds(at, at));
      }
    }

    if (gauge) {
      const at = STATIONS[gauge.station];
      if (at) {
        const band = gaugeBand(gauge);
        Lf.marker(at, {
          title: `${gauge.river} sensor`,
          zIndexOffset: 700,
          icon: Lf.divIcon({ className: "", iconSize: [18, 18], iconAnchor: [9, 9], html: `<span class="map-sensor" style="--c:${HEX[band]}"></span>` }),
        })
          .bindPopup(
            `<strong>River sensor</strong><br>${esc(gauge.river)} at ${esc(gauge.station)}<br>${gauge.reading.toFixed(2)} m, ${band} level<br>Danger level: ${gauge.bahaya} m`,
          )
          .addTo(layer);
        focus.push(Lf.latLngBounds(at, at));
      }
    }

    for (const g of groups) {
      const hit = reached.has(g.id);
      Lf.marker([g.lat, g.lng], {
        title: g.name,
        zIndexOffset: hit ? 500 : 0,
        icon: Lf.divIcon({
          className: "",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          html: `<span class="map-pin${hit ? " map-pin-hit" : ""}" style="--c:${hit ? color : "#8a857a"}"></span>`,
        }),
      })
        .bindPopup(
          `<strong>${esc(g.name)}</strong><br>${g.members} ${esc(g.community.toLowerCase())}<br>${esc(langInfo(g.lang).name)}, ${esc(g.town)}<br><span style="color:${hit ? "#1f7a54" : "#6b675f"}">${hit ? "Warning received" : "Not warned for this event"}</span>`,
        )
        .addTo(layer);
    }

    // Fly to the warned area, but only when the area itself changes.
    const target = focus.length
      ? focus.slice(1).reduce((b, x) => b.extend(x), Lf.latLngBounds(focus[0].getSouthWest(), focus[0].getNorthEast()))
      : Lf.latLngBounds(PENINSULA);
    const key = target.toBBoxString();
    if (key !== lastView.current) {
      lastView.current = key;
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const opts = { padding: [36, 36] as [number, number], maxZoom: 11 };
      if (still) map.fitBounds(target, opts);
      else map.flyToBounds(target, { ...opts, duration: 1.1 });
    }
  }, [facts, groups, reached, gauge, ready]);

  if (failed) return <>{fallback}</>;
  return (
    <div>
      <div
        ref={el}
        className="relative isolate z-0 h-[460px] w-full overflow-hidden rounded-xl bg-deep"
        role="application"
        aria-label="Map of Malaysia showing the warned area, worker groups, relief centres and river sensors"
      />
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 px-1 pt-2.5 text-[12px] text-mist-dim">
        <li className="flex items-center gap-1.5">
          <span className="map-pin" style={{ ["--c" as string]: "#8a857a", width: 12, height: 12, borderWidth: 2 }} aria-hidden /> Worker group
        </li>
        <li className="flex items-center gap-1.5">
          <span className="map-sensor" style={{ ["--c" as string]: "#f2b632", width: 10, height: 10, borderWidth: 2 }} aria-hidden /> River sensor
        </li>
        <li className="flex items-center gap-1.5">
          <span className="map-pps" style={{ fontSize: 9, padding: "3px 4px" }} aria-hidden>PPS</span> Relief centre
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-bahaya bg-bahaya/35" aria-hidden /> Warned area
        </li>
        <li className="ms-auto">Click a pin for details. Drag to move, use + and − to zoom.</li>
      </ul>
    </div>
  );
}
