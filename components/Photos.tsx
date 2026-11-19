"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export const MAX_PHOTOS = 6;

/** Shrink a phone photo to a JPEG at most `max` px on its long side. */
export async function shrink(file: File, max = 1280, quality = 0.8): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Couldn't read that photo"));
      i.src = url;
    });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't shrink that photo"))), "image/jpeg", quality));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Editable photo strip used inside the spot form. */
export function PhotoEditor({ photos, onChange }: { photos: string[]; onChange: (p: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [err, setErr] = useState("");
  const [view, setView] = useState<number | null>(null);
  const can = !!api().uploadPhoto;

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setErr("");
    const room = MAX_PHOTOS - photos.length;
    const list = [...files].slice(0, room);
    setBusy(list.length);
    const ids: string[] = [];
    for (const f of list) {
      try {
        ids.push(await api().uploadPhoto!(await shrink(f)));
      } catch (e: any) {
        setErr(e?.message?.includes("photo") ? e.message : "Couldn't upload that one, try again?");
      }
      setBusy((b) => b - 1);
    }
    if (ids.length) onChange([...photos, ...ids]);
    if (input.current) input.current.value = "";
  }

  if (!can && !photos.length) return null;
  return (
    <div className="photo-edit">
      <span className="lbl">Photos <small>{photos.length}/{MAX_PHOTOS}</small></span>
      <div className="photo-row">
        {photos.map((id, i) => (
          <div key={id} className="photo-th">
            <img src={api().photoUrl(id)} alt="" onClick={() => setView(i)} />
            {can && (
              <button type="button" className="rm" aria-label="remove photo" onClick={() => onChange(photos.filter((p) => p !== id))}>×</button>
            )}
          </div>
        ))}
        {Array.from({ length: busy }).map((_, i) => <div key={"b" + i} className="photo-th busy" />)}
        {can && photos.length + busy < MAX_PHOTOS && (
          <button type="button" className="photo-add" onClick={() => input.current?.click()}>
            <span>📷</span>
            <small>Add</small>
          </button>
        )}
      </div>
      {!can && <small className="hint">Only Editors can add photos.</small>}
      {err && <small className="err">{err}</small>}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
      {view != null && <Lightbox photos={photos} start={view} onClose={() => setView(null)} />}
    </div>
  );
}

export function Lightbox({ photos, start, onClose }: { photos: string[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const n = photos.length;
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => (x + 1) % n);
      if (e.key === "ArrowLeft") setI((x) => (x - 1 + n) % n);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [n, onClose]);
  const touch = useRef<number | null>(null);
  return (
    <div
      className="lightbox"
      onClick={(e) => { e.stopPropagation(); onClose(); }}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 40) setI((x) => (x + (dx < 0 ? 1 : -1) + n) % n);
        touch.current = null;
      }}
    >
      <img src={api().photoUrl(photos[i])} alt="" onClick={(e) => { e.stopPropagation(); setI((x) => (x + 1) % n); }} />
      {n > 1 && <div className="lb-dots">{photos.map((p, j) => <i key={p} className={j === i ? "on" : ""} />)}</div>}
      <button className="lb-x" aria-label="close">×</button>
    </div>
  );
}
