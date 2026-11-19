"use client";
// Builds our own Singapore base map in Leaflet from bundled vector data
// (no map tiles, so it works offline and inside sandboxed pages).
import type * as Leaflet from "leaflet";
import { STATIONS_LIST, codeColor, SG_BOUNDS } from "./stations";

type L = typeof Leaflet;
type Packed = {
  o: [number, number, number];
  land: number[][];
  areas: { n: string; c: [number, number]; r: number[][] }[];
  roads: number[][];
  rail: { n: string; c: string; lrt: boolean; r: number[][] }[];
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
  sea: "#d6e7ea",
  land: "#fdf6ee",
  green: "#e6efd8",
  areaLine: "#e7d3c2",
  road: "#ffffff",
  roadCasing: "#ecd9c7",
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
  map.attributionControl.addAttribution("Map data © OpenStreetMap contributors, LTA, URA");

  const data = await loadData();
  const dec = decoder(data.o);
  const canvas = Lf.canvas({ padding: 0.5 });

  // land
  Lf.polygon(data.land.map(dec), {
    renderer: canvas, stroke: true, color: "#e9d6c4", weight: 1, fillColor: PALETTE.land, fillOpacity: 1, interactive: false,
  }).addTo(map);

  // neighbourhoods
  const greens = data.areas.filter((a) => GREEN_AREAS.test(a.n));
  Lf.polygon(greens.flatMap((a) => a.r.map(dec)), {
    renderer: canvas, stroke: false, fillColor: PALETTE.green, fillOpacity: 1, interactive: false,
  }).addTo(map);
  Lf.polyline(data.areas.flatMap((a) => a.r.map(dec)), {
    renderer: canvas, color: PALETTE.areaLine, weight: 1, dashArray: "4 4", interactive: false,
  }).addTo(map);

  // roads (bus network): casing + fill
  const roadLatLngs = data.roads.map(dec);
  const casing = Lf.polyline(roadLatLngs, { renderer: canvas, color: PALETTE.roadCasing, weight: 2, interactive: false, smoothFactor: 1.2 }).addTo(map);
  const road = Lf.polyline(roadLatLngs, { renderer: canvas, color: PALETTE.road, weight: 1, interactive: false, smoothFactor: 1.2 }).addTo(map);

  // rail
  const railLayers = data.rail.map((l) =>
    Lf.polyline(l.r.map(dec), {
      renderer: canvas, color: l.c, weight: l.lrt ? 2 : 3.5, opacity: l.lrt ? 0.7 : 0.9, interactive: false, lineCap: "round",
    }).addTo(map)
  );

  // stations
  const stationLayer = Lf.layerGroup().addTo(map);
  for (const s of STATIONS_LIST) {
    const color = codeColor(s.k[0] ?? "");
    const inter = s.k.length > 1;
    Lf.circleMarker(s.ll, {
      renderer: canvas, radius: inter ? 4.5 : 3.2, color: inter ? "#3a2a25" : color, weight: inter ? 2 : 1.6,
      fillColor: "#fff", fillOpacity: 1, interactive: false,
    }).addTo(stationLayer);
    Lf.marker(s.ll, {
      interactive: false,
      keyboard: false,
      icon: Lf.divIcon({
        className: "lbl-stn",
        html: `<span>${s.k.map((k) => `<i style="background:${codeColor(k)}">${k}</i>`).join("")}${escapeHtml(s.n)}</span>`,
        iconSize: [0, 0],
      }),
    }).addTo(stationLayer);
  }

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
    const w = z < 12 ? 0.5 : z < 13 ? 0.9 : z < 14 ? 1.6 : z < 15 ? 2.6 : z < 16 ? 4 : 6;
    road.setStyle({ weight: w });
    casing.setStyle({ weight: w + (z >= 14 ? 1.6 : 0.8) });
    railLayers.forEach((r, i) => r.setStyle({ weight: (data.rail[i].lrt ? 2 : 3.5) * (z >= 15 ? 1.4 : 1) }));
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
