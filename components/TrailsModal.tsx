"use client";
import { useState } from "react";
import { TRAILS, regionFor, stationLL, trailMatch, type Trail, type TrailItem } from "@/lib/sg";
import type { Spot } from "@/lib/types";

export function trailProgress(t: Trail, spots: Spot[]) {
  const been = t.items.filter((i) => trailMatch(i, spots)?.status === "visited").length;
  return { been, total: t.items.length };
}

export default function TrailsModal({
  spots,
  onAdd,
  onOpen,
  onClose,
}: {
  spots: Spot[];
  onAdd: (item: TrailItem) => Promise<void>;
  onOpen: (s: Spot) => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal trails" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="x" onClick={onClose} aria-label="close">×</button>
        <h2>Makan trails</h2>
        <p className="meta">Little challenges around Singapore. Anything we've marked as been counts automatically.</p>
        {err && <div className="err">{err}</div>}
        {TRAILS.map((t) => {
          const { been, total } = trailProgress(t, spots);
          const isOpen = open === t.id;
          return (
            <div key={t.id} className={`trail ${been === total ? "done" : ""}`}>
              <button className="trail-head" onClick={() => setOpen(isOpen ? null : t.id)}>
                <span className="trail-emoji">{t.emoji}</span>
                <span className="trail-name">
                  <b>{t.name}</b>
                  <small>{been === total ? "completed, power lah 🎉" : `been to ${been} of ${total}`}</small>
                </span>
                <span className="trail-bar"><i style={{ width: `${(been / total) * 100}%` }} /></span>
              </button>
              {isOpen && (
                <div className="trail-body">
                  <p className="meta">{t.blurb}</p>
                  {t.items.map((i) => {
                    const s = trailMatch(i, spots);
                    return (
                      <div key={i.n} className={`trail-item ${s?.status ?? ""}`}>
                        <span className="ti-mark">{s?.status === "visited" ? "✓" : s ? "📌" : "○"}</span>
                        <span className="ti-name">
                          {i.n}
                          <small>🚇 {i.mrt}</small>
                        </span>
                        {s ? (
                          <button className="want" onClick={() => onOpen(s)}>{s.status === "visited" ? "open" : "on wishlist"}</button>
                        ) : (
                          <button className="want" disabled={busy === i.n} onClick={async () => {
                            setBusy(i.n);
                            setErr("");
                            try { await onAdd(i); } catch (e: any) { setErr(e.message); }
                            setBusy(null);
                          }}>{busy === i.n ? "adding…" : "+ wishlist"}</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        <p className="hint">Names are matched loosely, so "Tian Tian at Maxwell" still counts for Maxwell.</p>
      </div>
    </div>
  );
}

export const trailItemToSpot = (i: TrailItem): Partial<Spot> => {
  const ll = stationLL(i.mrt);
  return {
    name: i.n,
    mrt: i.mrt,
    area: ll ? regionFor(ll[0], ll[1]) : "Central",
    tags: i.tags,
    price: i.tags.includes("Hawker") || i.tags.includes("Kopitiam") ? 1 : i.tags.includes("Zi char") ? 3 : 2,
    status: "wishlist",
    cuisine: [],
  };
};
