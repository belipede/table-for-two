"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { AREAS, PRICE, avgScore, type Partner, type Plan, type Settings, type Spot } from "@/lib/types";
import SpotForm from "./SpotForm";
import SgMap from "./SgMap";
import OrderChips from "./OrderChips";
import AvatarEditor from "./AvatarEditor";
import { DEFAULT_AVATARS } from "@/lib/avatar";
import { ls } from "@/lib/api";
import { PRICE_SG, TAGS, scoreWord, tagLabel, todayStr } from "@/lib/sg";
import { Lightbox } from "./Photos";
import { PlanModal, Upcoming, fmtTime } from "./Plans";
import YearModal from "./YearModal";
import TrailsModal, { trailItemToSpot } from "./TrailsModal";

type Theme = "system" | "light" | "dark";

type Tab = "all" | "visited" | "wishlist" | "ours";
type Sort = "newest" | "top" | "recent" | "debate";

const other = (p: Partner): Partner => (p === "a" ? "b" : "a");

export default function FoodApp({
  initialSpots,
  initialSettings,
}: {
  initialSpots: Spot[];
  initialSettings: Settings;
}) {
  const [spots, setSpots] = useState<Spot[]>(initialSpots);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [me, setMe] = useState<Partner | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [by, setBy] = useState<"" | Partner>("");
  const [sort, setSort] = useState<Sort>("newest");
  const [editing, setEditing] = useState<{ spot: Partial<Spot> | null; markVisited?: boolean; planId?: string } | null>(null);
  const [spin, setSpin] = useState<Spot | null | "none">(null);
  const [showSettings, setShowSettings] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planEdit, setPlanEdit] = useState<Partial<Plan> | null>(null);
  const [showYear, setShowYear] = useState(false);
  const [showTrails, setShowTrails] = useState(false);
  const [tag, setTag] = useState("");
  const [price, setPrice] = useState(0);
  const [theme, setTheme] = useState<Theme>(() => (ls.get("t42_theme") as Theme) || "system");
  const [sysDark, setSysDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    setSysDark(mq.matches);
    const f = (e: MediaQueryListEvent) => setSysDark(e.matches);
    mq.addEventListener?.("change", f);
    return () => mq.removeEventListener?.("change", f);
  }, []);
  const dark = theme === "dark" || (theme === "system" && sysDark);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  const flipTheme = () => {
    const t: Theme = dark ? "light" : "dark";
    setTheme(t);
    ls.set("t42_theme", t);
  };

  const names = settings.names;

  useEffect(() => {
    api()
      .getMe()
      .then((m) => m && setMe(m))
      .finally(() => setMeLoaded(true));
  }, []);

  // keep in sync with whatever the other person adds
  useEffect(() => {
    const a = api().subscribeSpots(setSpots);
    const b = api().subscribeSettings(setSettings);
    const c = api().subscribePlans(setPlans);
    return () => {
      a();
      b();
      c();
    };
  }, []);

  const pickMe = (p: Partner) => {
    setMe(p);
    api().setMe(p);
  };

  const usedTags = useMemo(() => {
    const seen = new Set(spots.flatMap((s) => s.tags ?? []));
    return [...TAGS.map((t) => t.t).filter((t) => seen.has(t)), ...[...seen].filter((t) => !TAGS.some((x) => x.t === t))];
  }, [spots]);

  const cuisines = useMemo(
    () => [...new Set(spots.flatMap((s) => s.cuisine))].sort((a, b) => a.localeCompare(b)),
    [spots]
  );

  const stats = useMemo(() => {
    const visited = spots.filter((s) => s.status === "visited");
    const both = visited.filter((s) => s.ratings.a != null && s.ratings.b != null);
    const agree = both.filter((s) => Math.abs((s.ratings.a ?? 0) - (s.ratings.b ?? 0)) <= 1).length;
    const avgOf = (p: Partner) => {
      const v = visited.map((s) => s.ratings[p]).filter((x): x is number => x != null);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    };
    const avgA = avgOf("a");
    const avgB = avgOf("b");
    let picky: string | null = null;
    if (avgA != null && avgB != null && Math.abs(avgA - avgB) >= 0.3)
      picky = avgA < avgB ? names.a : names.b;
    return {
      visited: visited.length,
      wishlist: spots.length - visited.length,
      ours: spots.filter((s) => s.ourSpot).length,
      agreePct: both.length ? Math.round((agree / both.length) * 100) : null,
      picky,
      avgA,
      avgB,
    };
  }, [spots, names]);

  const daysTogether = useMemo(() => {
    if (!settings.since) return null;
    const d = Math.floor((Date.now() - new Date(settings.since).getTime()) / 86400000);
    return d >= 0 ? d : null;
  }, [settings.since]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = spots.filter((s) => {
      if (tab === "visited" && s.status !== "visited") return false;
      if (tab === "wishlist" && s.status !== "wishlist") return false;
      if (tab === "ours" && !s.ourSpot) return false;
      if (area && s.area !== area) return false;
      if (cuisine && !s.cuisine.includes(cuisine)) return false;
      if (by && s.addedBy !== by) return false;
      if (tag && !s.tags?.includes(tag)) return false;
      if (price && s.price !== price) return false;
      if (needle) {
        const hay = [s.name, s.area, s.mrt, s.dishes, s.memory, s.notes.a, s.notes.b, ...s.cuisine, ...(s.tags ?? []), ...(s.orders ?? []).map((o) => o.d)]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const gap = (s: Spot) =>
      s.ratings.a != null && s.ratings.b != null ? Math.abs(s.ratings.a - s.ratings.b) : -1;
    list.sort((x, y) => {
      if (sort === "top") return (avgScore(y) ?? -1) - (avgScore(x) ?? -1);
      if (sort === "recent") return (y.visitedOn ?? "").localeCompare(x.visitedOn ?? "");
      if (sort === "debate") return gap(y) - gap(x);
      return y.createdAt - x.createdAt;
    });
    return list;
  }, [spots, tab, q, area, cuisine, by, sort, tag, price]);

  async function save(data: Partial<Spot>) {
    const before = spots.find((s) => s.id === data.id);
    const body = await api().saveSpot(data);
    setSpots((prev) => [...prev.filter((s) => s.id !== body.id), body]);
    // tidy photos we took off, and a plan we just fulfilled
    for (const id of before?.photos ?? []) if (!body.photos?.includes(id)) api().deletePhoto?.(id);
    if (editing?.planId) api().deletePlan(editing.planId).catch(() => {});
    setEditing(null);
  }

  async function remove(id: string) {
    const gone = spots.find((s) => s.id === id);
    await api().deleteSpot(id);
    for (const p of gone?.photos ?? []) api().deletePhoto?.(p);
    for (const p of plans) if (p.spotId === id) api().deletePlan(p.id).catch(() => {});
    setSpots((prev) => prev.filter((s) => s.id !== id));
    setEditing(null);
  }

  async function addVisit(s: Spot) {
    const today = todayStr();
    const log = s.visitLog?.length ? s.visitLog : s.visitedOn ? [s.visitedOn] : [];
    await api().saveSpot({ ...s, visits: (s.visits ?? 1) + 1, visitedOn: today, visitLog: [...log, today] }).catch(() => {});
  }

  async function toggleWant(s: Spot) {
    if (!me) return;
    const wants = { ...s.wants, [me]: !s.wants[me] };
    setSpots((prev) => prev.map((x) => (x.id === s.id ? { ...x, wants } : x)));
    await api().saveSpot({ ...s, wants }).catch(() => {});
  }

  function spinTonight() {
    const wish = spots.filter((s) => s.status === "wishlist");
    if (!wish.length) return setSpin("none");
    // spots you BOTH want get three tickets in the hat
    const hat = wish.flatMap((s) => (s.wants.a && s.wants.b ? [s, s, s] : [s]));
    let pick = hat[Math.floor(Math.random() * hat.length)];
    if (spin && spin !== "none" && wish.length > 1) {
      while (pick.id === spin.id) pick = hat[Math.floor(Math.random() * hat.length)];
    }
    setSpin(pick);
  }

  if (!meLoaded) return null;

  if (!me) {
    return (
      <main className="who">
        <div className="who-card">
          <div className="login-emoji">👋</div>
          <h1>Who's hungry?</h1>
          <p>So we know whose ratings are whose. (Saved on this device.)</p>
          <div className="who-btns">
            <button className="btn primary big" onClick={() => pickMe("a")}>I'm {names.a}</button>
            <button className="btn primary big alt" onClick={() => pickMe("b")}>I'm {names.b}</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap">
      <header className="hero">
        <div className="hero-top">
          <span className="eyebrow">our food diary</span>
          <div className="hero-actions">
            <button className="link" onClick={flipTheme} aria-label={dark ? "light mode" : "dark mode"}>{dark ? "☀️ light" : "🌙 dark"}</button>
            <button className="link" onClick={() => setShowSettings(true)}>us ⚙︎</button>
            <button className="link" onClick={() => pickMe(other(me))}>
              not {names[me]}? switch
            </button>
          </div>
        </div>
        <h1>
          <span className="pa">{names.a}</span> <span className="amp">&amp;</span>{" "}
          <span className="pb">{names.b}</span>
          <span className="tft">a table for two</span>
        </h1>
        <p className="sub">
          Every place we've makan-ed together, and every place we keep saying "eh, we should go".
          {daysTogether != null && <> {daysTogether.toLocaleString()} days of eating together and counting 💞</>}
        </p>

        <div className="stats">
          <Stat n={stats.visited} label="places makan-ed" emoji="🍽️" />
          <Stat n={stats.wishlist} label="on our wishlist" emoji="📌" />
          <Stat n={stats.ours} label="our spots" emoji="💖" />
          <Stat n={stats.agreePct != null ? `${stats.agreePct}%` : "–"} label="taste-match" emoji="🤝" />
        </div>
        {stats.picky && (
          <p className="picky">
            Fun fact: <b>{stats.picky}</b> is the tougher critic (
            {names.a} avg {stats.avgA?.toFixed(1)} · {names.b} avg {stats.avgB?.toFixed(1)})
          </p>
        )}

        <div className="cta-row">
          <button className="btn primary" onClick={() => setEditing({ spot: null })}>
            + Add a spot
          </button>
          <button className="btn ghost" onClick={spinTonight}>
            🎲 Where we makan tonight?
          </button>
        </div>
        <div className="quick-row">
          <button onClick={() => setPlanEdit({})}><span>📅</span>Plan a date</button>
          <button onClick={() => setShowTrails(true)}><span>🏆</span>Makan trails</button>
          <button onClick={() => setShowYear(true)}><span>✨</span>Our year</button>
        </div>
      </header>

      <Upcoming
        plans={plans}
        spots={spots}
        onEdit={(p) => setPlanEdit(p)}
        onWent={(s, p) => setEditing({ spot: { ...s, visitedOn: p.on, ...(s.status === "visited" ? { visits: (s.visits ?? 1) + 1, visitLog: [...(s.visitLog ?? (s.visitedOn ? [s.visitedOn] : [])), p.on] } : {}) }, markVisited: true, planId: p.id })}
      />

      <div className="nav-row">
      <nav className="tabs">
        {(
          [
            ["all", "Everything"],
            ["visited", "Been together"],
            ["wishlist", "Want to try"],
            ["ours", "Our spots ♥"],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </nav>
        <div className="view-toggle">
          <button className={view === "list" ? "on" : ""} onClick={() => setView("list")}>▦ List</button>
          <button className={view === "map" ? "on" : ""} onClick={() => setView("map")}>🗺️ Map</button>
        </div>
      </div>

      <div className="filters">
        <input
          className="search"
          placeholder="Search places, dishes, memories…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">All areas</option>
          {AREAS.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <select value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
          <option value="">All cuisines</option>
          {cuisines.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={by} onChange={(e) => setBy(e.target.value as "" | Partner)}>
          <option value="">Added by anyone</option>
          <option value="a">Added by {names.a}</option>
          <option value="b">Added by {names.b}</option>
        </select>
        <select value={price} onChange={(e) => setPrice(Number(e.target.value))}>
          <option value={0}>Any price</option>
          {PRICE_SG.map((p, i) => (
            <option key={p.s} value={i + 1}>{p.s} {p.d} ({p.h})</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="newest">Newest added</option>
          <option value="top">Highest rated</option>
          <option value="recent">Most recently eaten</option>
          <option value="debate">Biggest disagreement</option>
        </select>
      </div>
      {usedTags.length > 0 && (
        <div className="tag-filter">
          {usedTags.map((t) => (
            <button key={t} className={`tag-btn ${tag === t ? "on" : ""}`} onClick={() => setTag(tag === t ? "" : t)}>{tagLabel(t)}</button>
          ))}
        </div>
      )}

      {view === "map" ? (
        <SgMap spots={shown} names={names} avatars={settings.avatars ?? DEFAULT_AVATARS} onDressUp={() => setShowSettings(true)} onOpen={(s) => setEditing({ spot: s })} />
      ) : shown.length === 0 ? (
        <div className="empty">
          <div className="empty-emoji">{spots.length ? "🔍" : "🥢"}</div>
          {spots.length ? (
            <p>Nothing matches leh. Try loosening the filters.</p>
          ) : (
            <>
              <p>Our list is empty! Add the first place you two loved, or one you're craving.</p>
              <button className="btn primary" onClick={() => setEditing({ spot: null })}>
                + Add our first spot
              </button>
            </>
          )}
        </div>
      ) : (
        <section className="grid">
          {shown.map((s) => (
            <Card
              key={s.id}
              s={s}
              me={me}
              names={names}
              onOpen={() => setEditing({ spot: s })}
              onWent={() => setEditing({ spot: s, markVisited: true })}
              onWant={() => toggleWant(s)}
              onVisit={() => addVisit(s)}
              plan={plans.filter((p) => p.spotId === s.id && p.on >= todayStr()).sort((a, b) => a.on.localeCompare(b.on))[0]}
              onPlan={(p) => setPlanEdit(p ?? { kind: "makan", spotId: s.id, title: s.name })}
            />
          ))}
        </section>
      )}

      <footer className="foot">made with 🍜, 🧋 and 💕 in Singapore · {names.a} &amp; {names.b}</footer>

      {planEdit && <PlanModal initial={planEdit} spots={spots} me={me} onClose={() => setPlanEdit(null)} />}
      {showYear && <YearModal spots={spots} names={names} onClose={() => setShowYear(false)} />}
      {showTrails && (
        <TrailsModal
          spots={spots}
          onClose={() => setShowTrails(false)}
          onOpen={(s) => { setShowTrails(false); setEditing({ spot: s }); }}
          onAdd={async (i) => {
            const body = await api().saveSpot({ ...trailItemToSpot(i), addedBy: me, wants: { [me]: true } });
            setSpots((prev) => [...prev.filter((x) => x.id !== body.id), body]);
          }}
        />
      )}

      {editing && (
        <SpotForm
          initial={editing.spot}
          markVisited={editing.markVisited}
          me={me}
          names={names}
          cuisines={cuisines}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={remove}
        />
      )}

      {spin && (
        <div className="overlay" onClick={() => setSpin(null)}>
          <div className="modal spin" onClick={(e) => e.stopPropagation()}>
            {spin === "none" ? (
              <>
                <div className="spin-emoji">🤷</div>
                <h2>Wishlist empty leh</h2>
                <p>Add a few places you want to try, then let fate decide. Or check out the makan trails for ideas.</p>
              </>
            ) : (
              <>
                <div className="spin-emoji">🎉</div>
                <p className="eyebrow">tonight we makan at</p>
                <h2>{spin.name}</h2>
                <p className="meta">
                  {spin.mrt ? `🚇 ${spin.mrt}` : spin.area} · {PRICE[spin.price - 1]} {PRICE_SG[spin.price - 1]?.d}
                  {spin.cuisine.length ? ` · ${spin.cuisine.join(", ")}` : ""}
                </p>
                {spin.wants.a && spin.wants.b && <p className="both">You both want this one 💞</p>}
                {spin.dishes && <p>Must order: {spin.dishes}</p>}
                <div className="cta-row center">
                  {spin.mapsUrl && (
                    <a className="btn primary" href={spin.mapsUrl} target="_blank" rel="noreferrer">
                      Take us there 📍
                    </a>
                  )}
                  <button className="btn ghost" onClick={() => { setPlanEdit({ kind: "makan", spotId: spin.id, title: spin.name }); setSpin(null); }}>
                    📅 Plan it
                  </button>
                  <button className="btn ghost" onClick={spinTonight}>
                    Spin again
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSave={async (s) => {
            try {
              setSettings(await api().saveSettings(s));
            } catch {}
            setShowSettings(false);
          }}
        />
      )}
    </main>
  );
}

function Stat({ n, label, emoji }: { n: number | string; label: string; emoji: string }) {
  return (
    <div className="stat">
      <span className="stat-emoji">{emoji}</span>
      <span className="stat-n">{n}</span>
      <span className="stat-l">{label}</span>
    </div>
  );
}

function Card({
  s,
  me,
  names,
  onOpen,
  onWent,
  onWant,
  onVisit,
  plan,
  onPlan,
}: {
  plan?: Plan;
  onPlan: (p?: Plan) => void;
  s: Spot;
  me: Partner;
  names: Record<Partner, string>;
  onOpen: () => void;
  onWent: () => void;
  onVisit: () => void;
  onWant: () => void;
}) {
  const score = avgScore(s);
  const visited = s.status === "visited";
  const bothWant = s.wants.a && s.wants.b;
  const [lb, setLb] = useState(false);
  return (
    <article className={`card ${visited ? "visited" : "wish"} ${s.ourSpot ? "ours" : ""} ${s.photos?.length ? "has-photo" : ""}`} onClick={onOpen}>
      {!!s.photos?.length && (
        <div className="card-photo" onClick={(e) => { e.stopPropagation(); setLb(true); }}>
          <img src={api().photoUrl(s.photos[0])} alt="" loading="lazy" />
          {s.photos.length > 1 && <span className="photo-count">📷 {s.photos.length}</span>}
        </div>
      )}
      {lb && s.photos && <Lightbox photos={s.photos} start={0} onClose={() => setLb(false)} />}
      <div className="card-top">
        <span className={`pill ${visited ? "pill-v" : "pill-w"}`}>
          {visited ? "been together" : "want to try"}
        </span>
        {s.ourSpot && <span className="pill pill-o">our spot ♥</span>}
        {visited && score != null && (
          <span className="score" title="our combined score">
            {score}
            <small>/10</small>
            <em className="score-word">{scoreWord(score)}</em>
          </span>
        )}
      </div>
      <h3>{s.name}</h3>
      <p className="meta">
        {s.mrt ? `🚇 ${s.mrt}` : s.area} · <span title={`${PRICE_SG[s.price - 1]?.d} per pax`}>{PRICE[s.price - 1]}</span>
        {visited && ` · been ${s.visits ?? 1}×`}
        {s.visitedOn && visited && ` · last ${new Date(s.visitedOn).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}`}
      </p>
      {(s.cuisine.length > 0 || !!s.tags?.length) && (
        <div className="chips">
          {(s.tags ?? []).map((t) => (
            <span key={"t" + t} className="chip tag">{tagLabel(t)}</span>
          ))}
          {s.cuisine.map((c) => (
            <span key={c} className="chip">{c}</span>
          ))}
        </div>
      )}
      {plan && (
        <button className="plan-badge" onClick={(e) => { e.stopPropagation(); onPlan(plan); }}>
          📅 {new Date(plan.on + "T00:00:00").toLocaleDateString("en-SG", { weekday: "short", day: "numeric", month: "short" })}{plan.at ? `, ${fmtTime(plan.at)}` : ""}
        </button>
      )}

      {visited && (s.ratings.a != null || s.ratings.b != null) && (
        <div className="duo">
          {(["a", "b"] as const).map((p) => (
            <div key={p} className={`duo-p ${p}`}>
              <span className="duo-name">{names[p]}</span>
              <span className="duo-score">{s.ratings[p] ?? "–"}</span>
            </div>
          ))}
        </div>
      )}

      {!!s.orders?.length && <OrderChips orders={s.orders} />}
      {s.dishes && (
        <p className="dishes">
          <b>Must order:</b> {s.dishes}
        </p>
      )}
      {(s.notes.a || s.notes.b) && (
        <div className="notes">
          {(["a", "b"] as const).map(
            (p) =>
              s.notes[p] && (
                <p key={p} className={`note ${p}`}>
                  <b>{names[p]}:</b> “{s.notes[p]}”
                </p>
              )
          )}
        </div>
      )}
      {s.memory && <p className="memory">💌 {s.memory}</p>}

      <div className="card-foot">
        <span className={`by ${s.addedBy}`}>added by {names[s.addedBy]}</span>
        {!visited && (
          <div className="foot-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className={`want ${s.wants[me] ? "on" : ""}`}
              onClick={onWant}
              title={s.wants[me] ? "un-want" : "I want to go too"}
            >
              {bothWant ? "💞 both" : s.wants[me] ? "❤️ me" : "🤍 me too"}
            </button>
            {!plan && <button className="want" onClick={() => onPlan()} title="Plan a date here">📅</button>}
            <button className="went" onClick={onWent}>We went! →</button>
          </div>
        )}
        {visited && !plan && (
          <button className="want visit-btn plan-btn" onClick={(e) => { e.stopPropagation(); onPlan(); }} title="Plan a date here">📅</button>
        )}
        {visited && (
          <button className="want visit-btn" onClick={(e) => { e.stopPropagation(); onVisit(); }} title="We went again today">
            +1 visit
          </button>
        )}
        {s.mapsUrl && visited && (
          <a href={s.mapsUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="map">
            📍 map
          </a>
        )}
      </div>
    </article>
  );
}

function SettingsModal({
  settings,
  onClose,
  onSave,
}: {
  settings: Settings;
  onClose: () => void;
  onSave: (s: Settings) => void;
}) {
  const [a, setA] = useState(settings.names.a);
  const [b, setB] = useState(settings.names.b);
  const [since, setSince] = useState(settings.since ?? "");
  const [avs, setAvs] = useState(settings.avatars ?? DEFAULT_AVATARS);
  return (
    <div className="overlay" onClick={onClose}>
      <form
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ names: { a, b }, since: since || undefined, avatars: avs });
        }}
      >
        <h2>About us</h2>
        <label>
          Partner one
          <input value={a} onChange={(e) => setA(e.target.value)} maxLength={30} />
        </label>
        <label>
          Partner two
          <input value={b} onChange={(e) => setB(e.target.value)} maxLength={30} />
        </label>
        <label>
          Together since (optional)
          <input type="date" value={since} onChange={(e) => setSince(e.target.value)} />
        </label>
        <h3 className="av-title">Our little avatars</h3>
        <AvatarEditor name={a} av={avs.a} onChange={(v) => setAvs({ ...avs, a: v })} />
        <AvatarEditor name={b} av={avs.b} onChange={(v) => setAvs({ ...avs, b: v })} />
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary">Save</button>
        </div>
      </form>
    </div>
  );
}
