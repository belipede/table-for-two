"use client";
// Builds our own Singapore base map in Leaflet from bundled vector data
// (no map tiles, so it works offline and inside sandboxed pages).
import type * as Leaflet from "leaflet";
import { SG_BOUNDS } from "./stations";

type L = typeof Leaflet;
type Packed = {
  o: [number, number, number];
  land: number[][];
  areas: { n: string; c: [number, number]; r: number[][] }[];
  roads: number[][];
};

let dataPromise: Promise<Packed> | null = null;
const loadData = () => (dataPromise ??= import("./geo/sgmap.json").then((m) => (m.default ?? m) as unknown as Packed));

function decoder(o: Packed["o"]) {
  const [ox, oy, s] = o;
  return (flat: number[]): [number, number][] => {
    const out: [number, number][] = [];
    let x = 0, y = 0;
    for (let i = 0; i < flat.length; i += 2) {
      x += flat[i];
      y += flat[i + 1];
      out.push([oy + y / s, ox + x / s]);
    }
    return out;
  };
}

const GREEN_AREAS = /water catchment|lim chu kang|mandai|simpang|western islands|north-eastern islands|southern islands|tengah/i;

export const PALETTE = {
  sea: "#dbe7e4",
  land: "#f6eee3",
  green: "#e3ead3",
  areaLine: "#ece0d2",
  road: "#fffdf8",
  roadCasing: "#ebdfd0",
};

export async function createBaseMap(Lf: L, el: HTMLElement, opts: { interactiveLabels?: boolean } = {}) {
  const pad = 0.04;
  const map = Lf.map(el, {
    zoomControl: false,
    attributionControl: true,
    preferCanvas: true,
    minZoom: 11,
    maxZoom: 18,
    zoomSnap: 0.5,
    maxBounds: Lf.latLngBounds(
      [SG_BOUNDS.south - pad, SG_BOUNDS.west - pad],
      [SG_BOUNDS.north + pad, SG_BOUNDS.east + pad]
    ),
    maxBoundsViscosity: 0.8,
  }).setView([1.3521, 103.8198], 12);
  map.attributionControl.setPrefix(false);
  map.attributionControl.addAttribution("Map data © OpenStreetMap contributors, URA");

  const data = await loadData();
  const dec = decoder(data.o);
  const canvas = Lf.canvas({ padding: 0.5 });

  // land
  Lf.polygon(data.land.map(dec), {
    renderer: canvas, stroke: true, color: "#e9dccb", weight: 1, fillColor: PALETTE.land, fillOpacity: 1, interactive: false,
  }).addTo(map);

  // neighbourhoods
  const greens = data.areas.filter((a) => GREEN_AREAS.test(a.n));
  Lf.polygon(greens.flatMap((a) => a.r.map(dec)), {
    renderer: canvas, stroke: false, fillColor: PALETTE.green, fillOpacity: 1, interactive: false,
  }).addTo(map);
  Lf.polyline(data.areas.flatMap((a) => a.r.map(dec)), {
    renderer: canvas, color: PALETTE.areaLine, weight: 0.8, dashArray: "2 5", interactive: false,
  }).addTo(map);

  // roads (bus network): casing + fill
  const roadLatLngs = data.roads.map(dec);
  const casing = Lf.polyline(roadLatLngs, { renderer: canvas, color: PALETTE.roadCasing, weight: 2, interactive: false, smoothFactor: 1.2 }).addTo(map);
  const road = Lf.polyline(roadLatLngs, { renderer: canvas, color: PALETTE.road, weight: 1, interactive: false, smoothFactor: 1.2 }).addTo(map);

  // area labels
  for (const a of data.areas) {
    Lf.marker(a.c, {
      interactive: false,
      keyboard: false,
      icon: Lf.divIcon({ className: "lbl-area", html: `<span>${escapeHtml(a.n)}</span>`, iconSize: [0, 0] }),
    }).addTo(map);
  }

  const restyle = () => {
    const z = map.getZoom();
    const w = z < 12 ? 0.7 : z < 13 ? 1.2 : z < 14 ? 2 : z < 15 ? 3.2 : z < 16 ? 5 : 7;
    road.setStyle({ weight: w });
    casing.setStyle({ weight: w + (z >= 14 ? 1.4 : 0.6) });
    const c = el.classList;
    for (const k of [...c]) if (k.startsWith("zl-")) c.remove(k);
    c.add(`zl-${Math.floor(z)}`);
  };
  map.on("zoomend", restyle);
  restyle();

  return map;
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
