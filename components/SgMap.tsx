"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { createBaseMap, escapeHtml } from "@/lib/basemap";
import { STATION_BY_NAME, codeColor } from "@/lib/stations";
import { PRICE, avgScore, type Partner, type Spot } from "@/lib/types";

/** Where a spot sits on the map: its own pin, else near its MRT station. */
export function spotPosition(s: Spot, nthAtStation = 0): { ll: [number, number]; exact: boolean } | null {
  if (typeof s.lat === "number" && typeof s.lng === "number") return { ll: [s.lat, s.lng], exact: true };
  const st = s.mrt ? STATION_BY_NAME[s.mrt] : undefined;
  if (!st) return null;
  // fan out spots that share a station so they don't stack
  const a = nthAtStation * 2.4;
  const r = nthAtStation ? 0.0009 + nthAtStation * 0.00012 : 0;
  return { ll: [st.ll[0] + Math.sin(a) * r, st.ll[1] + Math.cos(a) * r], exact: false };
}

export default function SgMap({
  spots,
  names,
  onOpen,
}: {
  spots: Spot[];
  names: Record<Partner, string>;
  onOpen: (s: Spot) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const fittedRef = useRef(false);

  const placed = useMemo(() => {
    const perStation: Record<string, number> = {};
    return spots
      .map((s) => {
        const n = !s.lat && s.mrt ? (perStation[s.mrt] = (perStation[s.mrt] ?? -1) + 1) : 0;
        const pos = spotPosition(s, n);
        return pos ? { s, ...pos } : null;
      })
      .filter(Boolean) as { s: Spot; ll: [number, number]; exact: boolean }[];
  }, [spots]);
  const unplaced = spots.length - placed.length;

  // build the map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default ?? (await import("leaflet"));
      if (cancelled || !el.current) return;
      LRef.current = L as typeof Leaflet;
      const map = await createBaseMap(L as typeof Leaflet, el.current);
      if (cancelled) {
        map.remove();
        return;
      }
      mapRef.current = map;
      layerRef.current = (L as typeof Leaflet).layerGroup().addTo(map);
      map.on("click", () => setSelected(null));
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // pins
  useEffect(() => {
    const L = LRef.current, map = mapRef.current, layer = layerRef.current;
    if (!ready || !L || !map || !layer) return;
    layer.clearLayers();
    for (const { s, ll } of placed) {
      const visited = s.status === "visited";
      const score = avgScore(s);
      const html = `<div class="pin2 ${visited ? "v" : "w"} ${s.ourSpot ? "ours" : ""} ${selected === s.id ? "sel" : ""}">
          <div class="pin2-dot">${visited ? (score != null ? score : "♥") : "★"}</div>
          <div class="pin2-name">${escapeHtml(s.name)}</div>
        </div>`;
      const m = L.marker(ll, {
        icon: L.divIcon({ className: "pin2-wrap", html, iconSize: [0, 0] }),
        riseOnHover: true,
        zIndexOffset: selected === s.id ? 1000 : visited ? 200 : 100,
        title: s.name,
      });
      m.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        setSelected(s.id);
        // keep the pin clear of the info card at the bottom
        const pt = map.latLngToContainerPoint(ll);
        const size = map.getSize();
        if (pt.y > size.y - 240 || pt.x < 40 || pt.x > size.x - 40 || pt.y < 60)
          map.panTo(ll, { animate: true });
      });
      m.addTo(layer);
    }
    if (!fittedRef.current && placed.length) {
      fittedRef.current = true;
      fitAll();
    }
  }, [ready, placed, selected]);

  function fitAll() {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map) return;
    if (!placed.length) return map.setView([1.3521, 103.8198], 12);
    if (placed.length === 1) return map.setView(placed[0].ll, 15);
    map.fitBounds(L.latLngBounds(placed.map((p) => p.ll)), { padding: [50, 50], maxZoom: 15 });
  }

  const sel = placed.find((p) => p.s.id === selected);
  const selSpot = sel?.s;
  const selScore = selSpot ? avgScore(selSpot) : null;
  const station = selSpot?.mrt ? STATION_BY_NAME[selSpot.mrt] : undefined;

  return (
    <div className="sgmap">
      <div ref={el} className="sgmap-canvas" />
      {!ready && <div className="sgmap-loading">Unfolding the map… 🗺️</div>}

      <div className="sgmap-ctl">
        <button onClick={() => mapRef.current?.zoomIn()} aria-label="zoom in">+</button>
        <button onClick={() => mapRef.current?.zoomOut()} aria-label="zoom out">−</button>
        <button onClick={fitAll} aria-label="show all our spots" title="show all our spots">♥</button>
      </div>

      <div className="sgmap-legend">
        <span><b className="dot v" /> been together</span>
        <span><b className="dot w" /> want to try</span>
        {unplaced > 0 && <span className="muted">{unplaced} not on the map yet: give {unplaced > 1 ? "them" : "it"} a location or nearest MRT</span>}
      </div>

      {selSpot && (
        <div className="sgmap-card" onClick={() => onOpen(selSpot)}>
          <div className="sgmap-card-top">
            <span className={`pill ${selSpot.status === "visited" ? "pill-v" : "pill-w"}`}>
              {selSpot.status === "visited" ? "been together" : "want to try"}
            </span>
            {selSpot.ourSpot && <span className="pill pill-o">our spot ♥</span>}
            {selScore != null && selSpot.status === "visited" && (
              <span className="score">{selScore}<small>/10</small></span>
            )}
            <button className="x small" onClick={(e) => { e.stopPropagation(); setSelected(null); }} aria-label="close">×</button>
          </div>
          <h3>{selSpot.name}</h3>
          <p className="meta">
            {station && (
              <span className="codes">
                {station.k.map((k) => <i key={k} style={{ background: codeColor(k) }}>{k}</i>)} {station.n} ·{" "}
              </span>
            )}
            {PRICE[selSpot.price - 1]}
            {selSpot.cuisine.length ? ` · ${selSpot.cuisine.join(", ")}` : ""} · added by {names[selSpot.addedBy]}
          </p>
          {selSpot.dishes && <p className="dishes"><b>Must order:</b> {selSpot.dishes}</p>}
          {selSpot.memory && <p className="memory">💌 {selSpot.memory}</p>}
          {!sel?.exact && <p className="hint">📍 Shown near {selSpot.mrt} MRT. Open it to pin the exact spot.</p>}
          <div className="sgmap-card-actions">
            <a
              href={selSpot.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selSpot.name + " Singapore")}`}
              target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="btn ghost small"
            >
              Google Maps ↗
            </a>
            <button className="btn primary small">Open</button>
          </div>
        </div>
      )}
    </div>
  );
}
