"use client";
import { useMemo, useState } from "react";
import { avgScore, type Partner, type Spot } from "@/lib/types";
import { scoreWord, tagLabel } from "@/lib/sg";

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const SPEND = [8, 20, 45, 80]; // rough $ per pax for $..$$$$

export const visitDates = (s: Spot) => (s.status !== "visited" ? [] : s.visitLog?.length ? s.visitLog : s.visitedOn ? [s.visitedOn] : []);

export default function YearModal({ spots, names, onClose }: { spots: Spot[]; names: Record<Partner, string>; onClose: () => void }) {
  const years = useMemo(() => {
    const ys = new Set<number>([new Date().getFullYear()]);
    spots.forEach((s) => visitDates(s).forEach((d) => ys.add(Number(d.slice(0, 4)))));
    return [...ys].sort((a, b) => b - a);
  }, [spots]);
  const [year, setYear] = useState(years[0]);

  const r = useMemo(() => {
    const y = String(year);
    const rows = spots
      .map((s) => {
        const all = visitDates(s);
        const inYear = all.filter((d) => d.startsWith(y));
        return { s, n: inYear.length, dates: inYear, isNew: !!all.length && all[0].startsWith(y) };
      })
      .filter((x) => x.n > 0);
    const visits = rows.reduce((a, x) => a + x.n, 0);
    const months = Array(12).fill(0);
    rows.forEach((x) => x.dates.forEach((d) => months[Number(d.slice(5, 7)) - 1]++));
    const most = [...rows].sort((a, b) => b.n - a.n)[0];
    const rated = rows.filter((x) => avgScore(x.s) != null).sort((a, b) => avgScore(b.s)! - avgScore(a.s)!);
    const gap = (s: Spot) => (s.ratings.a != null && s.ratings.b != null ? Math.abs(s.ratings.a - s.ratings.b) : -1);
    const fight = [...rows].sort((a, b) => gap(b.s) - gap(a.s))[0];
    const count = (f: (s: Spot) => string[]) => {
      const m: Record<string, number> = {};
      rows.forEach((x) => f(x.s).forEach((k) => (m[k] = (m[k] ?? 0) + x.n)));
      return Object.entries(m).sort((a, b) => b[1] - a[1])[0];
    };
    const tag = count((s) => s.tags ?? []);
    const cuisine = count((s) => s.cuisine);
    const hawker = rows.filter((x) => x.s.price === 1 || x.s.tags?.includes("Hawker")).reduce((a, x) => a + x.n, 0);
    const atas = rows.filter((x) => x.s.price === 4 || x.s.tags?.includes("Atas")).reduce((a, x) => a + x.n, 0);
    const mrts = new Set(rows.map((x) => x.s.mrt).filter(Boolean)).size;
    const spend = rows.reduce((a, x) => a + SPEND[(x.s.price || 2) - 1] * 2 * x.n, 0);
    const busiest = months.indexOf(Math.max(...months));
    return { rows, visits, months, most, top: rated[0], fight: fight && gap(fight.s) >= 1 ? fight : null, tag, cuisine, hawker, atas, mrts, spend, busiest, newCount: rows.filter((x) => x.isNew).length };
  }, [spots, year]);

  const max = Math.max(1, ...r.months);
  const monthName = (i: number) => new Date(2000, i, 1).toLocaleString("en-SG", { month: "long" });
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal year" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="x" onClick={onClose} aria-label="close">×</button>
        <p className="eyebrow">{names.a} &amp; {names.b}'s</p>
        <h2>Makan year in review</h2>
        {years.length > 1 && (
          <div className="year-pick">
            {years.map((y) => <button key={y} className={y === year ? "on" : ""} onClick={() => setYear(y)}>{y}</button>)}
          </div>
        )}
        {!r.visits ? (
          <p className="meta">No makan logged in {year} yet. Mark a place as been, or tap "+1 visit", and it shows up here.</p>
        ) : (
          <>
            <div className="yr-big">
              <div><b>{r.visits}</b><span>makan dates</span></div>
              <div><b>{r.rows.length}</b><span>places</span></div>
              <div><b>{r.newCount}</b><span>new to us</span></div>
            </div>
            <div className="yr-bars" aria-label="visits by month">
              {r.months.map((n, i) => (
                <div key={i} className="yr-bar" title={`${monthName(i)}: ${n}`}>
                  <i style={{ height: `${Math.round((n / max) * 68) + 3}px` }} className={n ? "" : "zero"} />
                  <small>{MONTHS[i]}</small>
                </div>
              ))}
            </div>
            <ul className="yr-list">
              {r.most && r.most.n > 1 && <li><span>🔁 Kept going back to</span><b>{r.most.s.name}</b><em>{r.most.n}×</em></li>}
              {r.top && <li><span>🏆 Top rated</span><b>{r.top.s.name}</b><em>{avgScore(r.top.s)} · {scoreWord(avgScore(r.top.s))}</em></li>}
              {r.fight && <li><span>⚔️ Biggest debate</span><b>{r.fight.s.name}</b><em>{names.a} {r.fight.s.ratings.a} vs {names.b} {r.fight.s.ratings.b}</em></li>}
              {r.tag && <li><span>🏷️ Our vibe</span><b>{tagLabel(r.tag[0])}</b><em>{r.tag[1]}×</em></li>}
              {r.cuisine && <li><span>🥢 Most eaten</span><b>{r.cuisine[0]}</b><em>{r.cuisine[1]}×</em></li>}
              <li><span>🍜 Hawker vs ✨ atas</span><b>{r.hawker} : {r.atas}</b><em>{r.hawker >= r.atas ? "true blue Singaporeans" : "wah, very atas"}</em></li>
              {r.mrts > 0 && <li><span>🚇 MRT stops makan-ed at</span><b>{r.mrts}</b><em>of 130+</em></li>}
              <li><span>📆 Hungriest month</span><b>{monthName(r.busiest)}</b><em>{r.months[r.busiest]} {r.months[r.busiest] === 1 ? "date" : "dates"}</em></li>
              <li><span>💸 Roughly spent</span><b>${r.spend.toLocaleString()}</b><em>for two, give or take</em></li>
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
