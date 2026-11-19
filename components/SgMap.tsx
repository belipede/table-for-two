"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { createBaseMap, escapeHtml } from "@/lib/basemap";
import { avatarSvg, type Avatar } from "@/lib/avatar";
import OrderChips from "./OrderChips";
import { api } from "@/lib/api";
import { STATION_BY_NAME, STATION_NAMES, inSg } from "@/lib/stations";
import { distM, fmtDist, scoreWord, walkMins } from "@/lib/sg";
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

const LINES = ["hungry already 🍜", "eat what ah? 🤔", "supper later? 🌙", "teh peng run? 🧋", "die liao, starving 😩", "you choose lah 💕", "dabao or dine in? 🥡"];
const ARRIVE = ["shiok, this one! 😋", "jom, let's go 💕", "sedap sia 🤤", "date night? ✨", "can or not? 🥺", "queue also worth it ⏳"];

export default function SgMap({
  spots,
  names,
  avatars,
  onOpen,
  onDressUp,
}: {
  spots: Spot[];
  names: Record<Partner, string>;
  avatars: Record<Partner, Avatar>;
  onOpen: (s: Spot) => void;
  onDressUp?: () => void;
}) {
  const coupleRef = useRef<Leaflet.Marker | null>(null);
  const walkRef = useRef<number | null>(null);
  const [say, setSay] = useState<string | null>(null);
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const fittedRef = useRef(false);
  const [near, setNear] = useState<{ ll: [number, number]; label: string } | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [mrtText, setMrtText] = useState("");
  const [locating, setLocating] = useState(false);
  const youRef = useRef<Leaflet.Marker | null>(null);

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

  // the two of us hang out at the last place we ate together
  const home = useMemo<[number, number]>(() => {
    const v = placed
      .filter((p) => p.s.status === "visited")
      .sort((x, y) => (y.s.visitedOn ?? "").localeCompare(x.s.visitedOn ?? "") || y.s.updatedAt - x.s.updatedAt)[0];
    return v ? v.ll : [1.2868, 103.8545];
  }, [placed]);

  // build the map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default ?? (await import("leaflet"));
      if (cancelled || !el.current) return;
      LRef.current = L as typeof Leaflet;
      const map = await createBaseMap(L as typeof Leaflet, el.current, { tilt: true });
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
      if (walkRef.current) cancelAnimationFrame(walkRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
      coupleRef.current = null;
    };
  }, []);

  // pins
  useEffect(() => {
    const L = LRef.current, map = mapRef.current, layer = layerRef.current;
    if (!ready || !L || !map || !layer) return;
    layer.clearLayers();
    for (const { s, ll } of placed) {
      const visited = s.status === "visited";
      const html = `<div class="pin2 ${visited ? "v" : "w"} ${s.ourSpot ? "ours" : ""} ${selected === s.id ? "sel" : ""}">
          <div class="pin2-dot"></div>
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

  // us two, as a marker that can walk around
  useEffect(() => {
    const L = LRef.current, map = mapRef.current;
    if (!ready || !L || !map) return;
    const html = `<div class="couple">
        <div class="couple-say"></div>
        <div class="couple-heart">♥</div>
        <div class="couple-pair">
          <div class="buddy a"><span class="buddy-name">${escapeHtml(names.a)}</span>${avatarSvg(avatars.a, { size: 40 })}</div>
          <div class="buddy b"><span class="buddy-name">${escapeHtml(names.b)}</span>${avatarSvg(avatars.b, { size: 40 })}</div>
        </div>
      </div>`;
    const icon = L.divIcon({ className: "couple-wrap", html, iconSize: [0, 0] });
    if (coupleRef.current) coupleRef.current.setIcon(icon);
    else {
      const m = L.marker(home, { icon, zIndexOffset: 2000, keyboard: false, title: `${names.a} & ${names.b}` }).addTo(map);
      m.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        setSay(LINES[Math.floor(Math.random() * LINES.length)]);
      });
      coupleRef.current = m;
    }
  }, [ready, avatars, names]); // eslint-disable-line react-hooks/exhaustive-deps

  // walk home when nothing is selected, or over to the chosen spot
  useEffect(() => {
    const target = placed.find((p) => p.s.id === selected)?.ll ?? home;
    walkTo(target);
  }, [selected, home]); // eslint-disable-line react-hooks/exhaustive-deps

  // speech bubble
  useEffect(() => {
    const el = coupleRef.current?.getElement()?.querySelector(".couple-say") as HTMLElement | null;
    if (!el) return;
    el.textContent = say ?? "";
    el.classList.toggle("on", !!say);
    if (!say) return;
    const t = setTimeout(() => setSay(null), 2600);
    return () => clearTimeout(t);
  }, [say]);

  function walkTo(to: [number, number]) {
    const m = coupleRef.current, map = mapRef.current;
    if (!m || !map) return;
    if (walkRef.current) cancelAnimationFrame(walkRef.current);
    const from = m.getLatLng();
    const dist = map.distance(from, to);
    if (dist < 1) return;
    // stand just beside the pin rather than on top of it
    const off = to; // CSS keeps us standing just left of the pin
    const el = m.getElement();
    el?.classList.add("walking");
    const dur = Math.min(1600, 500 + dist / 8), t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      m.setLatLng([from.lat + (off[0] - from.lat) * e, from.lng + (off[1] - from.lng) * e]);
      if (k < 1) walkRef.current = requestAnimationFrame(step);
      else {
        walkRef.current = null;
        m.getElement()?.classList.remove("walking");
        if (selected) setSay(ARRIVE[Math.floor(Math.random() * ARRIVE.length)]);
      }
    };
    walkRef.current = requestAnimationFrame(step);
  }

  // "you are here" dot
  useEffect(() => {
    const L = LRef.current, map = mapRef.current;
    if (!ready || !L || !map) return;
    youRef.current?.remove();
    youRef.current = null;
    if (!near) return;
    youRef.current = L.marker(near.ll, {
      icon: L.divIcon({ className: "you-wrap", html: `<div class="you-dot"><i></i><span>${escapeHtml(near.label)}</span></div>`, iconSize: [0, 0] }),
      zIndexOffset: 1500,
      keyboard: false,
      interactive: false,
    }).addTo(map);
    // keep the dot in the top half, clear of the list card
    map.once("moveend", () => map.panBy([0, Math.round(map.getSize().y * 0.22)], { animate: true }));
    map.flyTo(near.ll, Math.max(map.getZoom(), 15), { duration: 0.8 });
  }, [ready, near]);

  const closest = useMemo(
    () => (near ? placed.map((p) => ({ ...p, d: distM(near.ll, p.ll) })).sort((a, b) => a.d - b.d).slice(0, 5) : []),
    [near, placed]
  );

  function findMe() {
    if (near) return setNear(null);
    setSelected(null);
    if (!navigator.geolocation) return setAsking("Can't find you here. Which MRT are you near?");
    setLocating(true);
    let done = false;
    const fail = (why: string) => {
      if (done) return;
      done = true;
      setLocating(false);
      setAsking(why);
    };
    const t = setTimeout(() => fail("Location's taking too long. Which MRT are you near?"), 8000);
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (done) return;
          done = true;
          clearTimeout(t);
          setLocating(false);
          const ll: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          if (inSg(ll[0], ll[1])) setNear({ ll, label: "you" });
          else setAsking("Looks like you're not in Singapore. Which MRT should we start from?");
        },
        () => { clearTimeout(t); fail("Location is blocked in here. Which MRT are you near?"); },
        { enableHighAccuracy: false, timeout: 7000, maximumAge: 120000 }
      );
    } catch {
      clearTimeout(t);
      fail("Location is blocked in here. Which MRT are you near?");
    }
  }

  function pickMrt(e?: React.FormEvent) {
    e?.preventDefault();
    const n = STATION_NAMES.find((x) => x.toLowerCase() === mrtText.trim().toLowerCase());
    if (!n) return;
    setNear({ ll: STATION_BY_NAME[n].ll, label: `${n} MRT` });
    setAsking(null);
  }

  function fitAll() {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map) return;
    if (!placed.length) return map.setView([1.3521, 103.8198], 12);
    if (placed.length === 1) return map.setView(placed[0].ll, 15);
    map.fitBounds(L.latLngBounds(placed.map((p) => p.ll)), { paddingTopLeft: [50, 130], paddingBottomRight: [70, 50], maxZoom: 14.5 });
  }

  function surprise() {
    const map = mapRef.current;
    if (!map || !placed.length) return;
    const wish = placed.filter((p) => p.s.status === "wishlist");
    const pool = (wish.length ? wish : placed).filter((p) => p.s.id !== selected);
    const pick = (pool.length ? pool : placed)[Math.floor(Math.random() * (pool.length || placed.length))];
    setSelected(pick.s.id);
    map.flyTo(pick.ll, Math.max(map.getZoom(), 15), { duration: 0.9 });
  }

  const sel = placed.find((p) => p.s.id === selected);
  const selSpot = sel?.s;
  const selScore = selSpot ? avgScore(selSpot) : null;
  const station = selSpot?.mrt ? STATION_BY_NAME[selSpot.mrt] : undefined;

  return (
    <div className={`sgmap ${selected ? "has-card" : ""}`}>
      <div ref={el} className="sgmap-canvas" />
      <div className="sgmap-fog" aria-hidden="true" />
      {!ready && <div className="sgmap-loading">Unfolding the map… 🗺️</div>}

      <div className="sgmap-fabs">
        <button className={`fab ${near ? "on" : ""}`} onClick={findMe} title="What's near me?">
          <span className="fab-label">{locating ? "Finding you…" : near ? "Clear" : "Near me"}</span>
          <span className="fab-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="7" /></svg></span>
        </button>
        <button className="fab" onClick={surprise} title="Pick somewhere from our wishlist">
          <span className="fab-label">Surprise us</span>
          <span className="fab-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="9" cy="9" r="1" fill="currentColor" /><circle cx="15" cy="15" r="1" fill="currentColor" /><circle cx="15" cy="9" r="1" fill="currentColor" /><circle cx="9" cy="15" r="1" fill="currentColor" /></svg></span>
        </button>
        <button className="fab" onClick={() => { setSelected(null); fitAll(); }} title="Show all our spots">
          <span className="fab-label">Show all</span>
          <span className="fab-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg></span>
        </button>
        {onDressUp && (
          <button className="fab" onClick={onDressUp} title="Change how we look">
            <span className="fab-label">Dress us up</span>
            <span className="fab-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 4l-4 3 2 4 2-1v10h8V10l2 1 2-4-4-3a4 4 0 0 1-8 0z" /></svg></span>
          </button>
        )}
        <button className="fab" onClick={() => mapRef.current?.zoomIn()} aria-label="zoom in">
          <span className="fab-icon">+</span>
        </button>
        <button className="fab" onClick={() => mapRef.current?.zoomOut()} aria-label="zoom out">
          <span className="fab-icon">−</span>
        </button>
      </div>

      <div className="sgmap-legend">
        <span><b className="dot v" /> been together</span>
        <span><b className="dot w" /> want to try</span>
        {unplaced > 0 && <span className="muted">{unplaced} not on the map yet: give {unplaced > 1 ? "them" : "it"} a location or nearest MRT</span>}
      </div>

      {asking && (
        <form className="sgmap-card near-ask" onSubmit={pickMrt}>
          <button type="button" className="x small" onClick={() => setAsking(null)} aria-label="close">×</button>
          <b>📍 {asking}</b>
          <div className="order-add">
            <input value={mrtText} onChange={(e) => setMrtText(e.target.value)} list="near-mrt" placeholder="e.g. Tanjong Pagar" autoFocus />
            <datalist id="near-mrt">{STATION_NAMES.map((n) => <option key={n} value={n} />)}</datalist>
            <button className="btn primary small" disabled={!STATION_NAMES.some((x) => x.toLowerCase() === mrtText.trim().toLowerCase())}>Go</button>
          </div>
        </form>
      )}

      {near && !selSpot && (
        <div className="sgmap-card near-list">
          <div className="sgmap-card-top">
            <b>Closest to {near.label}</b>
            <button className="x small" onClick={() => setNear(null)} aria-label="close">×</button>
          </div>
          {closest.length ? closest.map((p) => (
            <button key={p.s.id} className="near-row" onClick={() => { setSelected(p.s.id); mapRef.current?.flyTo(p.ll, Math.max(mapRef.current.getZoom(), 15), { duration: 0.7 }); }}>
              <b className={`dot ${p.s.status === "visited" ? "v" : "w"}`} />
              <span className="near-name">{p.s.name}</span>
              <span className="near-d">{fmtDist(p.d)}{p.d < 2500 ? ` · ${walkMins(p.d)} min walk` : ""}</span>
            </button>
          )) : <p className="meta">No places on the map yet.</p>}
        </div>
      )}

      {selSpot && (
        <div className="sgmap-card" onClick={() => onOpen(selSpot)}>
          <div className="sgmap-card-top">
            <span className={`pill ${selSpot.status === "visited" ? "pill-v" : "pill-w"}`}>
              {selSpot.status === "visited" ? "been together" : "want to try"}
            </span>
            {selSpot.ourSpot && <span className="pill pill-o">our spot ♥</span>}
            {selScore != null && selSpot.status === "visited" && (
              <span className="score">{selScore}<small>/10</small><em className="score-word">{scoreWord(selScore)}</em></span>
            )}
            <button className="x small" onClick={(e) => { e.stopPropagation(); setSelected(null); }} aria-label="close">×</button>
          </div>
          <h3>{selSpot.name}</h3>
          <p className="meta">
            {station && <>🚇 {station.n} · </>}
            {near && <>{fmtDist(distM(near.ll, sel!.ll))} away · </>}
            {selSpot.status === "visited" && <>been {selSpot.visits ?? 1}× · </>}
            {PRICE[selSpot.price - 1]}
            {selSpot.cuisine.length ? ` · ${selSpot.cuisine.join(", ")}` : ""} · added by {names[selSpot.addedBy]}
          </p>
          {!!selSpot.photos?.length && (
            <div className="map-photos">
              {selSpot.photos.slice(0, 4).map((id) => <img key={id} src={api().photoUrl(id)} alt="" />)}
            </div>
          )}
          {!!selSpot.orders?.length && <OrderChips orders={selSpot.orders} max={4} />}
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
