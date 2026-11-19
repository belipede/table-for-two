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

const SMALL_AREAS = /^(downtown core|marina east|marina south|museum|newton|singapore river|rochor|outram|orchard|river valley|straits view|tanglin|kallang)$/i;
const GREEN_AREAS = /water catchment|lim chu kang|mandai|simpang|western islands|north-eastern islands|southern islands|tengah/i;

export const PALETTE = {
  sea: "#9fdcef",
  land: "#c9efb6",
  beach: "#fff1c9",
  green: "#9fdc8c",
  areaLine: "#b4e29f",
  road: "#ffffff",
  roadCasing: "#b6e3a3",
};

// Little landmark props sprinkled on the map, toy-world style.
const PROPS: { ll: [number, number]; e: string; t?: string; minZ?: number }[] = [
  { ll: [1.2893, 103.8631], e: "🎡", t: "Flyer" },
  { ll: [1.2816, 103.8636], e: "🌸", t: "Gardens by the Bay" },
  { ll: [1.3138, 103.8159], e: "🌺", t: "Botanic Gardens" },
  { ll: [1.3644, 103.9915], e: "✈️", t: "Changi" },
  { ll: [1.2494, 103.8303], e: "🏝️", t: "Sentosa" },
  { ll: [1.4043, 103.793], e: "🦒", t: "Zoo" },
  { ll: [1.4044, 103.9625], e: "🚲", t: "Pulau Ubin" },
  { ll: [1.3004, 103.9123], e: "🏖️", t: "East Coast" },
  { ll: [1.3554, 103.8058], e: "🌳" },
  { ll: [1.3726, 103.7888], e: "🌳" },
  { ll: [1.3626, 103.8193], e: "🌲" },
  { ll: [1.3876, 103.8033], e: "🌳" },
  { ll: [1.3411, 103.7766], e: "🌲", t: "Bukit Timah Hill" },
  { ll: [1.2797, 103.8546], e: "🦁", minZ: 13 },
  { ll: [1.2302, 103.8721], e: "⛵" },
  { ll: [1.2402, 103.7651], e: "⛵" },
  { ll: [1.2801, 103.9505], e: "🛳️" },
  { ll: [1.2101, 103.8201], e: "🐠" },
  { ll: [1.4521, 103.7451], e: "🐟" },
  { ll: [1.3302, 104.0401], e: "🐳" },
  { ll: [1.2602, 103.6551], e: "⛵" },
];

export async function createBaseMap(Lf: L, el: HTMLElement, opts: { interactiveLabels?: boolean; tilt?: boolean } = {}) {
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
  el.classList.add("toy-map");

  const data = await loadData();
  const dec = decoder(data.o);

  // the island gets its own pane so CSS can give it a chunky "toy tile" edge
  map.createPane("island").style.zIndex = "250";
  map.createPane("ground").style.zIndex = "300";
  const islandCanvas = Lf.canvas({ padding: 0.5, pane: "island" });
  const canvas = Lf.canvas({ padding: 0.5, pane: "ground" });

  if (opts.tilt) {
    // a big sea under everything, so the far horizon isn't empty when tilted
    map.createPane("sea").style.zIndex = "200";
    Lf.rectangle([[SG_BOUNDS.south - 0.6, SG_BOUNDS.west - 0.8], [SG_BOUNDS.north + 0.6, SG_BOUNDS.east + 0.8]], {
      renderer: Lf.canvas({ padding: 0.6, pane: "sea" }), stroke: false, fillColor: PALETTE.sea, fillOpacity: 1, interactive: false,
    }).addTo(map);
  }

  const landRings = data.land.map(dec);
  // sandy beach rim, then the grass on top
  Lf.polygon(landRings, {
    renderer: islandCanvas, stroke: true, color: PALETTE.beach, weight: 7, lineJoin: "round",
    fillColor: PALETTE.land, fillOpacity: 1, interactive: false,
  }).addTo(map);

  // nature areas
  const greens = data.areas.filter((a) => GREEN_AREAS.test(a.n));
  Lf.polygon(greens.flatMap((a) => a.r.map(dec)), {
    renderer: canvas, stroke: false, fillColor: PALETTE.green, fillOpacity: 0.9, interactive: false,
  }).addTo(map);
  Lf.polyline(data.areas.flatMap((a) => a.r.map(dec)), {
    renderer: canvas, color: PALETTE.areaLine, weight: 1.2, dashArray: "1 6", lineCap: "round", interactive: false,
  }).addTo(map);

  // roads as little white paths
  const roadLatLngs = data.roads.map(dec);
  const casing = Lf.polyline(roadLatLngs, { renderer: canvas, color: PALETTE.roadCasing, weight: 2, interactive: false, smoothFactor: 1.2, lineCap: "round", lineJoin: "round" }).addTo(map);
  const road = Lf.polyline(roadLatLngs, { renderer: canvas, color: PALETTE.road, weight: 1, interactive: false, smoothFactor: 1.2, lineCap: "round", lineJoin: "round" }).addTo(map);

  // area labels
  for (const a of data.areas) {
    Lf.marker(a.c, {
      interactive: false,
      keyboard: false,
      icon: Lf.divIcon({ className: `lbl-area ${SMALL_AREAS.test(a.n) ? "small" : ""}`, html: `<span>${escapeHtml(a.n)}</span>`, iconSize: [0, 0] }),
    }).addTo(map);
  }

  // props
  for (const p of PROPS) {
    Lf.marker(p.ll, {
      interactive: false,
      keyboard: false,
      icon: Lf.divIcon({
        className: `prop ${p.minZ ? "prop-z" + p.minZ : ""}`,
        html: `<span class="prop-e">${p.e}</span>${p.t ? `<span class="prop-t">${escapeHtml(p.t)}</span>` : ""}`,
        iconSize: [0, 0],
      }),
    }).addTo(map);
  }

  const mirror: HTMLElement[] = [];
  (map as any)._zlMirror = mirror;
  const restyle = () => {
    const z = map.getZoom();
    const w = z < 12 ? 0.8 : z < 13 ? 1.4 : z < 14 ? 2.4 : z < 15 ? 3.6 : z < 16 ? 5.5 : 8;
    road.setStyle({ weight: w });
    casing.setStyle({ weight: w + (z >= 14 ? 2 : 1) });
    const c = el.classList;
    for (const k of [...c]) if (k.startsWith("zl-")) c.remove(k);
    c.add(`zl-${Math.floor(z)}`);
    for (const m of mirror) m.className = m.className.replace(/\bzl-\d+\b/g, "").trim() + ` zl-${Math.floor(z)}`;
  };
  map.on("zoomend", restyle);
  restyle();

  // camera tilts more the closer you zoom, like a little game world
  if (opts.tilt && el.parentElement) setupTilt(Lf, map, el, el.parentElement);

  return map;
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Tilt the ground with CSS, but keep markers flat and upright in an overlay,
 * positioned by projecting each one through the same perspective in JS.
 * (Avoids preserve-3d, which browsers render inconsistently.)
 */
const PERSPECTIVE = 1000;
const ORIGIN_Y = 0.55; // transform-origin of the tilted ground
const EYE_Y = 0.35; // perspective-origin
const tiltFor = (z: number) => Math.max(0, Math.min(50, (z - 12.5) * 17));

function setupTilt(Lf: L, map: Leaflet.Map, el: HTMLElement, host: HTMLElement) {
  const M: any = map;
  el.classList.add("tilt");
  map.setMaxZoom(16); // past this our road data runs out

  const overlay = document.createElement("div");
  overlay.className = `tilt-overlay toy-map zl-${Math.floor(map.getZoom())}`;
  host.insertBefore(overlay, el.nextSibling);
  overlay.appendChild(map.getPane("markerPane")!);
  M._zlMirror?.push(overlay);
  // Leaflet listens for marker clicks on its container; the overlay sits outside it
  Lf.DomEvent.on(overlay, "click dblclick mousedown mouseup mouseover mouseout mousemove contextmenu", M._handleDOMEvent, map);

  let tilt = tiltFor(map.getZoom()), target = tilt, raf = 0;
  const tracked = new Set<any>();

  const project = (pos: Leaflet.Point) => {
    const size = map.getSize();
    const pane = Lf.DomUtil.getPosition(map.getPane("mapPane")!);
    const x = pos.x + pane.x, y = pos.y + pane.y;
    const t = (tilt * Math.PI) / 180;
    const ox = size.x / 2, oy = size.y * ORIGIN_Y;
    const dy = y - oy;
    const Y = oy + dy * Math.cos(t), Z = dy * Math.sin(t);
    const s = PERSPECTIVE / (PERSPECTIVE - Z);
    const px = size.x / 2, py = size.y * EYE_Y;
    return { p: Lf.point(px + (x - px) * s, py + (Y - py) * s), s };
  };
  M._tiltProject = project;
  M._tiltTracked = tracked;

  const proto: any = Lf.Marker.prototype;
  if (!proto.__tiltPatched) {
    proto.__tiltPatched = true;
    const orig = proto._setPos;
    proto._setPos = function (pos: Leaflet.Point) {
      const pj = this._map?._tiltProject;
      if (!pj) return orig.call(this, pos);
      this._tiltRaw = pos;
      this._map._tiltTracked.add(this);
      const r = pj(pos);
      orig.call(this, r.p.round());
      if (this._icon) this._icon.style.transform += ` scale(${Math.max(0.35, Math.min(1.6, r.s)).toFixed(3)})`;
    };
    const origRemove = proto.onRemove;
    proto.onRemove = function (m: any) {
      m?._tiltTracked?.delete(this);
      return origRemove.call(this, m);
    };
  }

  const reproject = () => {
    for (const m of tracked) if (m._icon && m._tiltRaw) m._setPos(m._tiltRaw);
  };
  const apply = () => {
    el.style.transform = tilt > 0.05 ? `rotateX(${tilt.toFixed(2)}deg)` : "";
    host.style.setProperty("--fog", String(Math.min(1, tilt / 30)));
    reproject();
  };
  const tick = () => {
    const d = target - tilt;
    tilt = Math.abs(d) < 0.1 ? target : tilt + d * 0.18;
    apply();
    raf = tilt === target ? 0 : requestAnimationFrame(tick);
  };
  const aim = (z: number) => {
    target = tiltFor(z);
    if (!raf) raf = requestAnimationFrame(tick);
  };

  map.on("move", reproject);
  map.on("zoom", () => aim(map.getZoom()));
  map.on("zoomanim", (e: Leaflet.ZoomAnimEvent) => {
    overlay.classList.add("zooming");
    aim(e.zoom);
  });
  map.on("zoomend", () => {
    overlay.classList.remove("zooming");
    aim(map.getZoom());
  });
  map.on("resize", reproject);
  map.on("unload", () => {
    cancelAnimationFrame(raf);
    overlay.remove();
  });
  // markers added before the tilt was set up need placing through it too
  map.eachLayer((l) => { if (l instanceof Lf.Marker) (l as any).update(); });
  apply();
}
