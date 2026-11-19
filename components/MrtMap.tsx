"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { LINES, STATIONS, STATION_LINES, pointOf } from "@/lib/mrt";
import { PRICE, avgScore, type Partner, type Spot } from "@/lib/types";

const U = 14; // px per grid unit
const PAD = 4; // grid units of padding

export default function MrtMap({
  spots,
  names,
  onOpen,
}: {
  spots: Spot[];
  names: Record<Partner, string>;
  onOpen: (s: Spot) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [allNames, setAllNames] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  // on small screens (or when zooming) keep the city centre in view
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) * 0.55;
    el.scrollTop = (el.scrollHeight - el.clientHeight) * 0.6;
  }, [zoom]);

  const byStation = useMemo(() => {
    const m: Record<string, Spot[]> = {};
    for (const s of spots) if (s.mrt && STATIONS[s.mrt]) (m[s.mrt] ??= []).push(s);
    return m;
  }, [spots]);
  const unmapped = spots.filter((s) => !s.mrt || !STATIONS[s.mrt]).length;

  const box = useMemo(() => {
    const xs = Object.values(STATIONS).map((p) => p[0]);
    const ys = Object.values(STATIONS).map((p) => p[1]);
    const minX = Math.min(...xs) - PAD;
    const minY = Math.min(...ys) - PAD - 2;
    return { minX, minY, w: Math.max(...xs) + PAD + 6 - minX, h: Math.max(...ys) + PAD - minY };
  }, []);

  const X = (x: number) => (x - box.minX) * U;
  const Y = (y: number) => (y - box.minY) * U;

  // segments, with lanes so lines that share track sit side by side
  const segments = useMemo(() => {
    const raw: { a: string; b: string; color: string; key: string }[] = [];
    for (const l of LINES)
      for (const p of l.paths)
        for (let i = 0; i < p.length - 1; i++) {
          const key = [p[i], p[i + 1]].sort().join("|");
          raw.push({ a: p[i], b: p[i + 1], color: l.color, key });
        }
    const counts: Record<string, number> = {};
    raw.forEach((s) => (counts[s.key] = (counts[s.key] ?? 0) + 1));
    const seen: Record<string, number> = {};
    return raw.map((s) => {
      const lane = (seen[s.key] = (seen[s.key] ?? -1) + 1);
      const n = counts[s.key];
      return { ...s, offset: n > 1 ? (lane - (n - 1) / 2) * 5 : 0 };
    });
  }, []);

  // decide label direction from the station's own track direction
  const labelFor = (name: string) => {
    const [x, y] = STATIONS[name];
    let horiz = 0, vert = 0;
    for (const l of LINES)
      for (const p of l.paths) {
        const i = p.indexOf(name);
        if (i < 0) continue;
        for (const j of [i - 1, i + 1]) {
          if (j < 0 || j >= p.length) continue;
          const [nx, ny] = pointOf(p[j]);
          horiz += Math.abs(nx - x);
          vert += Math.abs(ny - y);
        }
      }
    return horiz > vert * 1.5 ? "rot" : "right";
  };

  const sel = selected ? byStation[selected] ?? [] : [];

  return (
    <div className="mrt">
      <div className="mrt-bar">
        <div className="mrt-legend">
          {LINES.map((l) => (
            <span key={l.code} className="mrt-leg">
              <i style={{ background: l.color }} />
              {l.name}
            </span>
          ))}
        </div>
        <div className="mrt-tools">
          <label className="mrt-check">
            <input type="checkbox" checked={allNames} onChange={(e) => setAllNames(e.target.checked)} /> all names
          </label>
          <button onClick={() => setZoom((z) => Math.max(1, z - 0.5))} disabled={zoom <= 1}>−</button>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.5))} disabled={zoom >= 3}>+</button>
        </div>
      </div>

      <div className="mrt-scroll" ref={scroller}>
        <svg
          viewBox={`0 0 ${box.w * U} ${box.h * U}`}
          style={{ width: `${zoom * 100}%`, minWidth: zoom === 1 ? 760 : undefined }}
          role="img"
          aria-label="MRT map of our food spots"
        >
          {segments.map((s, i) => {
            const [ax, ay] = pointOf(s.a);
            const [bx, by] = pointOf(s.b);
            const dx = X(bx) - X(ax), dy = Y(by) - Y(ay);
            const len = Math.hypot(dx, dy) || 1;
            const ox = (-dy / len) * s.offset, oy = (dx / len) * s.offset;
            return (
              <line
                key={i}
                x1={X(ax) + ox} y1={Y(ay) + oy} x2={X(bx) + ox} y2={Y(by) + oy}
                stroke={s.color} strokeWidth={5} strokeLinecap="round"
              />
            );
          })}

          {Object.entries(STATIONS).map(([name, [x, y]]) => {
            const lines = STATION_LINES[name] ?? [];
            const inter = lines.length > 1;
            const here = byStation[name];
            const showLabel = allNames || inter || !!here || selected === name;
            const dir = labelFor(name);
            const cx = X(x), cy = Y(y);
            const hasVisited = here?.some((s) => s.status === "visited");
            return (
              <g
                key={name}
                className={`stn ${here ? "has" : ""} ${selected === name ? "sel" : ""}`}
                onClick={() => setSelected(here ? (selected === name ? null : name) : null)}
              >
                <title>{name}{here ? ` · ${here.length} spot${here.length > 1 ? "s" : ""}` : ""}</title>
                <circle
                  cx={cx} cy={cy} r={inter ? 5.5 : 3.6}
                  fill="#fff" stroke={inter ? "#3a2a25" : lines[0]?.color} strokeWidth={inter ? 2 : 1.8}
                />
                {showLabel && (
                  <text
                    className={`stn-label ${here ? "strong" : ""}`}
                    x={dir === "rot" ? cx + (here ? 10 : 5) : cx + (here ? 16 : 9)}
                    y={dir === "rot" ? cy - (here ? 12 : 7) : cy + 4}
                    transform={dir === "rot" ? `rotate(-40 ${cx + (here ? 10 : 5)} ${cy - (here ? 12 : 7)})` : undefined}
                  >
                    {name}
                  </text>
                )}
                {here && (
                  <g className="pin" transform={`translate(${cx} ${cy})`}>
                    <circle r={selected === name ? 15 : 12} className={hasVisited ? "pin-v" : "pin-w"} />
                    <text y={4.5} textAnchor="middle" className="pin-n">
                      {hasVisited ? "♥" : "★"}{here.length > 1 ? here.length : ""}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mrt-key">
        <span><b className="dot pin-v" /> been together</span>
        <span><b className="dot pin-w" /> want to try</span>
        {unmapped > 0 && (
          <span className="muted">
            {unmapped} spot{unmapped > 1 ? "s" : ""} without a nearest MRT yet; edit them to put them on the map
          </span>
        )}
      </div>

      {selected && sel.length > 0 && (
        <div className="mrt-panel">
          <div className="mrt-panel-head">
            <h3>
              <span className="mrt-codes">
                {(STATION_LINES[selected] ?? []).map((l) => (
                  <i key={l.code} style={{ background: l.color }}>{l.code}</i>
                ))}
              </span>
              {selected}
            </h3>
            <button className="link" onClick={() => setSelected(null)}>close</button>
          </div>
          <div className="mrt-list">
            {sel.map((s) => {
              const score = avgScore(s);
              return (
                <button key={s.id} className="mrt-item" onClick={() => onOpen(s)}>
                  <span className={`pill ${s.status === "visited" ? "pill-v" : "pill-w"}`}>
                    {s.status === "visited" ? "been" : "want"}
                  </span>
                  <span className="mrt-item-name">{s.name}</span>
                  <span className="meta">
                    {PRICE[s.price - 1]}
                    {s.cuisine.length ? ` · ${s.cuisine.join(", ")}` : ""} · by {names[s.addedBy]}
                  </span>
                  {score != null && <span className="mrt-score">{score}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
