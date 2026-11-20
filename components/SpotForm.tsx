"use client";
import { useState } from "react";
import { AREAS, PRICE, type Partner, type Spot } from "@/lib/types";
import { STATION_BY_NAME, STATION_NAMES, coordsFromMapsUrl } from "@/lib/stations";
import LocationPicker from "./LocationPicker";
import { PhotoEditor } from "./Photos";
import { PRICE_SG, TAGS, scoreWord, tagLabel, todayStr } from "@/lib/sg";

export default function SpotForm({
  initial,
  markVisited,
  me,
  names,
  cuisines,
  onClose,
  onSave,
  onDelete,
}: {
  initial: Partial<Spot> | null;
  markVisited?: boolean;
  me: Partner;
  names: Record<Partner, string>;
  cuisines: string[];
  onClose: () => void;
  onSave: (s: Partial<Spot>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const today = todayStr();
  const [s, setS] = useState<Partial<Spot>>(() => {
    const base: Partial<Spot> = {
      name: "",
      area: "Central",
      cuisine: [],
      price: 2,
      status: "wishlist",
      addedBy: me,
      ratings: {},
      notes: {},
      wants: { [me]: true },
      ...initial,
    };
    if (markVisited) {
      base.status = "visited";
      base.visitedOn = base.visitedOn ?? today;
    }
    return base;
  });
  const [cuisineText, setCuisineText] = useState((initial?.cuisine ?? []).join(", "));
  const [mrtText, setMrtText] = useState(initial?.mrt ?? "");
  const [picking, setPicking] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [dish, setDish] = useState("");
  const orders = s.orders ?? [];
  const addDish = () => {
    const d = dish.trim().slice(0, 40);
    if (!d || orders.length >= 12 || orders.some((o) => o.d.toLowerCase() === d.toLowerCase())) return setDish("");
    setS((p) => ({ ...p, orders: [...(p.orders ?? []), { d }] }));
    setDish("");
  };
  const [confirmDel, setConfirmDel] = useState(false);
  const [tagText, setTagText] = useState("");
  const tags = s.tags ?? [];
  const toggleTag = (t: string) =>
    setS((p) => {
      const cur = p.tags ?? [];
      return { ...p, tags: cur.includes(t) ? cur.filter((x) => x !== t) : cur.length >= 8 ? cur : [...cur, t] };
    });
  const addCustomTag = () => {
    const t = tagText.trim().slice(0, 24);
    if (t && !tags.some((x) => x.toLowerCase() === t.toLowerCase())) toggleTag(t[0].toUpperCase() + t.slice(1));
    setTagText("");
  };

  const set = <K extends keyof Spot>(k: K, v: Spot[K]) => setS((p) => ({ ...p, [k]: v }));
  const setPer = (k: "ratings" | "notes", p: Partner, v: number | string | undefined) =>
    setS((prev) => ({ ...prev, [k]: { ...(prev[k] ?? {}), [p]: v } }));

  const visited = s.status === "visited";
  const isNew = !s.id;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const mrt = STATION_NAMES.find((n) => n.toLowerCase() === mrtText.trim().toLowerCase());
    if (mrtText.trim() && !mrt) {
      setErr("Pick the MRT station from the list (or leave it blank)");
      setBusy(false);
      return;
    }
    try {
      await onSave({
        mrt,
        ...s,
        cuisine: cuisineText
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
          .map((c) => c[0].toUpperCase() + c.slice(1)),
      });
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  // show "me" first so the person filling it in sees their own fields up top
  const order: Partner[] = me === "a" ? ["a", "b"] : ["b", "a"];

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal form" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <button type="button" className="x" onClick={onClose} aria-label="close">×</button>
        <h2>{isNew ? "Add a spot" : markVisited ? "How was it? 🥰" : s.name}</h2>

        <div className="seg">
          <button type="button" className={!visited ? "on" : ""} onClick={() => set("status", "wishlist")}>
            📌 Want to try
          </button>
          <button
            type="button"
            className={visited ? "on" : ""}
            onClick={() => setS((p) => ({ ...p, status: "visited", visitedOn: p.visitedOn ?? today }))}
          >
            🍽️ Been together
          </button>
        </div>

        <label>
          Place
          <input
            value={s.name ?? ""}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Hill Street Tai Hwa Pork Noodle"
            autoFocus={isNew}
            required
          />
        </label>

        <div className="pick-field">
          <span className="lbl">Whose pick?</span>
          <div className="seg">
            {(["a", "b"] as const).map((p) => (
              <button key={p} type="button" className={(s.addedBy ?? me) === p ? "on" : ""} onClick={() => set("addedBy", p)}>
                {names[p]}
              </button>
            ))}
          </div>
        </div>

        <div className="row">
          <label>
            Area
            <select value={s.area} onChange={(e) => set("area", e.target.value)}>
              {AREAS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label>
            Price per pax
            <div className="price">
              {PRICE.map((p, i) => (
                <button
                  type="button"
                  key={p}
                  className={s.price === i + 1 ? "on" : ""}
                  onClick={() => set("price", i + 1)}
                  title={`${PRICE_SG[i].d} (${PRICE_SG[i].h})`}
                >
                  {p}
                </button>
              ))}
            </div>
            <small className="price-hint">{s.price ? `${PRICE_SG[s.price - 1].d}, ${PRICE_SG[s.price - 1].h}` : ""}</small>
          </label>
        </div>

        <label>
          Nearest MRT 🚇
          <input
            value={mrtText}
            onChange={(e) => setMrtText(e.target.value)}
            placeholder="start typing, e.g. Tiong Bahru"
            list="mrt-list"
          />
          <datalist id="mrt-list">
            {STATION_NAMES.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </label>

        <div className="loc-row">
          <span className="lbl">On the map</span>
          <button type="button" className={`btn ghost small ${s.lat != null ? "pinned" : ""}`} onClick={() => setPicking(true)}>
            {s.lat != null ? "📍 Pinned, change it" : "📍 Pin the exact spot"}
          </button>
          {s.lat == null && (
            <span className="hint">
              {STATION_BY_NAME[mrtText] ? `otherwise shown near ${mrtText} MRT` : "or pick a nearest MRT"}
            </span>
          )}
        </div>

        <label>
          Cuisine (comma separated)
          <input
            value={cuisineText}
            onChange={(e) => setCuisineText(e.target.value)}
            placeholder="Japanese, Hawker, Dessert"
            list="cuisine-list"
          />
          <datalist id="cuisine-list">
            {cuisines.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>

        <div className="tag-edit">
          <span className="lbl">Tags</span>
          <div className="tag-chips">
            {[...TAGS.map((x) => x.t), ...tags.filter((t) => !TAGS.some((x) => x.t === t))].map((t) => (
              <button type="button" key={t} className={`tag-btn ${tags.includes(t) ? "on" : ""}`} onClick={() => toggleTag(t)}>
                {tagLabel(t)}
              </button>
            ))}
            <input
              className="tag-new"
              value={tagText}
              maxLength={24}
              placeholder="+ own tag"
              onChange={(e) => setTagText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
              onBlur={addCustomTag}
            />
          </div>
        </div>

        {(!visited || s.dishes) && <label>
          {visited ? "Must-order dishes" : "Dishes we want to try"}
          <input
            value={s.dishes ?? ""}
            onChange={(e) => set("dishes", e.target.value)}
            placeholder="bak chor mee dry, extra chilli"
          />
        </label>}

        <label>
          Google Maps link
          <input
            value={s.mapsUrl ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              const ll = coordsFromMapsUrl(v);
              setS((p) => ({ ...p, mapsUrl: v, ...(ll && p.lat == null ? { lat: ll[0], lng: ll[1] } : {}) }));
            }}
            placeholder="https://maps.app.goo.gl/…"
            inputMode="url"
          />
        </label>

        {!visited && (
          <div className="wants">
            <span className="lbl">Who wants to go?</span>
            {order.map((p) => (
              <button
                type="button"
                key={p}
                className={`want ${s.wants?.[p] ? "on" : ""}`}
                onClick={() => setS((prev) => ({ ...prev, wants: { ...prev.wants, [p]: !prev.wants?.[p] } }))}
              >
                {s.wants?.[p] ? "❤️" : "🤍"} {names[p]}
              </button>
            ))}
          </div>
        )}

        {visited && (
          <>
            <div className="visit-row">
              <label>
                Last time we went
                <input type="date" value={s.visitedOn ?? ""} onChange={(e) => set("visitedOn", e.target.value)} />
              </label>
              <div className="visits">
                <span className="lbl">Times we've been</span>
                <div className="stepper">
                  <button type="button" onClick={() => set("visits", Math.max(1, (s.visits ?? 1) - 1))} aria-label="one less">−</button>
                  <b>{s.visits ?? 1}</b>
                  <button type="button" onClick={() => set("visits", Math.min(999, (s.visits ?? 1) + 1))} aria-label="one more">+</button>
                </div>
              </div>
            </div>

            <div className="orders-edit">
              <span className="lbl">What we order <small>tap ★ for the ones to get again</small></span>
              {orders.length > 0 && (
                <div className="order-chips">
                  {orders.map((o, i) => (
                    <span key={o.d} className={`order-chip ${o.fav ? "fav" : ""}`}>
                      <button type="button" className="star" aria-label={o.fav ? "unstar" : "star"}
                        onClick={() => set("orders", orders.map((x, j) => (j === i ? { ...x, fav: !x.fav || undefined } : x)))}>
                        {o.fav ? "★" : "☆"}
                      </button>
                      {o.d}
                      <button type="button" className="rm" aria-label={`remove ${o.d}`} onClick={() => set("orders", orders.filter((_, j) => j !== i))}>×</button>
                    </span>
                  ))}
                </div>
              )}
              {orders.length < 12 && (
                <div className="order-add">
                  <input value={dish} maxLength={40} placeholder="e.g. char kway teow, less oil"
                    onChange={(e) => setDish(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDish(); } }} />
                  <button type="button" className="btn ghost small" onClick={addDish} disabled={!dish.trim()}>Add</button>
                </div>
              )}
            </div>

            <div className="rate-grid">
              {order.map((p) => (
                <div key={p} className={`rate ${p}`}>
                  <div className="rate-head">
                    <span>{names[p]}'s score{p === me ? " (you)" : ""}</span>
                    <b>{s.ratings?.[p] ?? "–"} <small className="sw-word">{scoreWord(s.ratings?.[p])}</small></b>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={s.ratings?.[p] ?? 5}
                    onChange={(e) => setPer("ratings", p, Number(e.target.value))}
                    onPointerUp={(e) => setPer("ratings", p, Number(e.currentTarget.value))}
                    className={s.ratings?.[p] == null ? "unset" : ""}
                  />
                  {s.ratings?.[p] != null && (
                    <button type="button" className="link small" onClick={() => setPer("ratings", p, undefined)}>
                      clear
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {order.map((p) => (
          <label key={p}>
            {names[p]}'s note{p === me ? " (you)" : ""}
            <textarea
              rows={2}
              value={s.notes?.[p] ?? ""}
              onChange={(e) => setPer("notes", p, e.target.value)}
              placeholder={visited ? "the broth damn shiok…" : "saw this on TikTok, looks so good leh"}
            />
          </label>
        ))}

        {visited && (
          <>
            <label>
              Date memory 💌
              <textarea
                rows={3}
                value={s.memory ?? ""}
                onChange={(e) => set("memory", e.target.value)}
                placeholder="the night it poured and we waited at the void deck…"
              />
            </label>
            <label className="check">
              <input type="checkbox" checked={!!s.ourSpot} onChange={(e) => set("ourSpot", e.target.checked)} />
              This is one of <i>our spots</i> ♥
            </label>
          </>
        )}

        <PhotoEditor photos={s.photos ?? []} onChange={(p) => set("photos", p)} />

        {err && <div className="err">{err}</div>}

        {picking && (
          <LocationPicker
            initial={s.lat != null && s.lng != null ? [s.lat, s.lng] : undefined}
            center={STATION_BY_NAME[mrtText]?.ll}
            onClose={() => setPicking(false)}
            onPick={(ll) => {
              setS((p) => ({ ...p, lat: ll?.[0], lng: ll?.[1] }));
              setPicking(false);
            }}
          />
        )}

        <div className="form-actions">
          {!isNew &&
            (confirmDel ? (
              <button type="button" className="btn danger" onClick={() => onDelete(s.id!)}>
                Really delete?
              </button>
            ) : (
              <button type="button" className="btn ghost del" onClick={() => setConfirmDel(true)}>
                Delete
              </button>
            ))}
          <span className="spacer" />
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </div>
  );
}
