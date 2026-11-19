"use client";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { fmtDay, todayStr } from "@/lib/sg";
import type { Partner, Plan, PlanKind, Spot } from "@/lib/types";

const KINDS: [PlanKind, string][] = [
  ["makan", "🍜 Makan"],
  ["activity", "🎳 Activity"],
  ["popup", "🎪 Pop-up"],
];
export const KIND_EMOJI: Record<PlanKind, string> = { makan: "🍜", activity: "🎳", popup: "🎪" };

function nextSaturday() {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const fmtTime = (t?: string) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}${m ? ":" + String(m).padStart(2, "0") : ""}${h < 12 ? "am" : "pm"}`;
};

function ics(p: Plan, where?: string) {
  const d = p.on.replace(/-/g, "");
  const esc = (s: string) => s.replace(/[\\,;]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Table for Two//EN", "BEGIN:VEVENT", `UID:${p.id}@tablefortwo`];
  if (p.at) {
    const [h, m] = p.at.split(":").map(Number);
    const end = `${String(Math.min(23, h + 2)).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
    lines.push(`DTSTART;TZID=Asia/Singapore:${d}T${p.at.replace(":", "")}00`, `DTEND;TZID=Asia/Singapore:${d}T${end}`);
  } else lines.push(`DTSTART;VALUE=DATE:${d}`);
  lines.push(`SUMMARY:${esc(p.title)}`);
  if (where) lines.push(`LOCATION:${esc(where)}`);
  if (p.note) lines.push(`DESCRIPTION:${esc(p.note)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function PlanModal({
  initial,
  spots,
  me,
  onClose,
}: {
  initial: Partial<Plan>;
  spots: Spot[];
  me: Partner;
  onClose: () => void;
}) {
  const [p, setP] = useState<Partial<Plan>>({ kind: "makan", on: nextSaturday(), at: "19:00", createdBy: me, ...initial });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<Plan | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const set = <K extends keyof Plan>(k: K, v: Plan[K] | undefined) => setP((x) => ({ ...x, [k]: v }));
  const sorted = useMemo(
    () => [...spots].sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name) : a.status === "wishlist" ? -1 : 1)),
    [spots]
  );
  const spot = spots.find((s) => s.id === p.spotId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const title = p.kind === "makan" ? spot?.name ?? p.title : p.title;
      const plan = await api().savePlan({ ...p, title });
      if (api().saveFile) setSaved(plan);
      else onClose();
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  }

  if (saved) {
    const s = spots.find((x) => x.id === saved.spotId);
    return (
      <div className="overlay" onClick={onClose}>
        <div className="modal spin" onClick={(e) => e.stopPropagation()}>
          <div className="spin-emoji">📅</div>
          <h2>Confirm plus chop!</h2>
          <p className="meta">{saved.title} · {fmtDay(saved.on)}{saved.at ? `, ${fmtTime(saved.at)}` : ""}</p>
          <div className="cta-row center">
            <button className="btn ghost" onClick={async () => {
              await api().saveFile!(`${saved.title.replace(/[^\w ]+/g, "").trim() || "date"}.ics`, ics(saved, s ? `${s.name}${s.mrt ? `, near ${s.mrt} MRT` : ""}, Singapore` : undefined)).catch(() => {});
            }}>Add to calendar</button>
            <button className="btn primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <button type="button" className="x" onClick={onClose} aria-label="close">×</button>
        <h2>{p.id ? "Our plan" : "Plan a date"}</h2>
        <div className="seg seg3">
          {KINDS.map(([k, l]) => (
            <button type="button" key={k} className={p.kind === k ? "on" : ""} onClick={() => set("kind", k)}>{l}</button>
          ))}
        </div>
        {p.kind === "makan" ? (
          <label>
            Where
            <select value={p.spotId ?? ""} onChange={(e) => setP((x) => ({ ...x, spotId: e.target.value || undefined, title: spots.find((s) => s.id === e.target.value)?.name }))} required>
              <option value="">Pick a place…</option>
              {sorted.map((s) => (
                <option key={s.id} value={s.id}>{s.status === "wishlist" ? "📌 " : "🍽️ "}{s.name}</option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <label>
              What
              <input value={p.title ?? ""} onChange={(e) => set("title", e.target.value)} maxLength={80} required
                placeholder={p.kind === "popup" ? "e.g. Christmas Wonderland at Gardens by the Bay" : "e.g. cycling at East Coast Park"} />
            </label>
            <label>
              Theme (optional)
              <input value={p.theme ?? ""} onChange={(e) => set("theme", e.target.value)} maxLength={40} placeholder="Christmas, CNY, Deepavali, rainy day…" />
            </label>
          </>
        )}
        <div className="row">
          <label>
            Day
            <input type="date" value={p.on ?? ""} min={p.id ? undefined : todayStr()} onChange={(e) => set("on", e.target.value)} required />
          </label>
          <label>
            Time (optional)
            <input type="time" value={p.at ?? ""} onChange={(e) => set("at", e.target.value || undefined)} />
          </label>
        </div>
        <label>
          Note (optional)
          <input value={p.note ?? ""} onChange={(e) => set("note", e.target.value)} maxLength={200} placeholder="go early, the queue damn long" />
        </label>
        {err && <div className="err">{err}</div>}
        <div className="form-actions">
          {p.id &&
            (confirmDel ? (
              <button type="button" className="btn danger" onClick={async () => { await api().deletePlan(p.id!).catch(() => {}); onClose(); }}>Really cancel?</button>
            ) : (
              <button type="button" className="btn ghost del" onClick={() => setConfirmDel(true)}>Cancel plan</button>
            ))}
          <span className="spacer" />
          <button className="btn primary" disabled={busy}>{busy ? "Saving…" : p.id ? "Save" : "Chope this date"}</button>
        </div>
      </form>
    </div>
  );
}

/** "Coming up" strip, plus a nudge for plans whose day has passed. */
export function Upcoming({
  plans,
  spots,
  onEdit,
  onWent,
}: {
  plans: Plan[];
  spots: Spot[];
  onEdit: (p: Plan) => void;
  onWent: (spot: Spot, plan: Plan) => void;
}) {
  const today = todayStr();
  const next = plans.filter((p) => p.on >= today).sort((a, b) => (a.on + (a.at ?? "")).localeCompare(b.on + (b.at ?? "")));
  const past = plans.filter((p) => p.on < today).sort((a, b) => b.on.localeCompare(a.on)).slice(0, 2);
  if (!next.length && !past.length) return null;
  const daysTo = (on: string) => Math.round((new Date(on + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86400000);
  return (
    <section className="upcoming">
      {past.map((p) => {
        const s = spots.find((x) => x.id === p.spotId);
        return (
          <div key={p.id} className="up-ask">
            <span>Eh, did we go to <b>{p.title}</b> on {fmtDay(p.on)}?</span>
            <div className="up-ask-btns">
              <button className="went" onClick={() => (s && p.kind === "makan" ? onWent(s, p) : api().deletePlan(p.id))}>Yes we went!</button>
              <button className="want" onClick={() => api().deletePlan(p.id)}>Didn't happen</button>
            </div>
          </div>
        );
      })}
      {next.length > 0 && (
        <>
          <span className="eyebrow">coming up</span>
          <div className="up-row">
            {next.map((p) => {
              const d = daysTo(p.on);
              return (
                <button key={p.id} className={`up-card ${p.kind}`} onClick={() => onEdit(p)}>
                  <span className="up-when">{d === 0 ? "Today" : d === 1 ? "Tomorrow" : fmtDay(p.on)}{p.at ? ` · ${fmtTime(p.at)}` : ""}</span>
                  <span className="up-title">{KIND_EMOJI[p.kind]} {p.title}</span>
                  {p.theme && <span className="up-theme">{p.theme}</span>}
                  {d > 1 && <span className="up-count">in {d} days</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
