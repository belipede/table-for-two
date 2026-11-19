"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type * as Leaflet from "leaflet";
import { createBaseMap } from "@/lib/basemap";

export default function LocationPicker({
  initial,
  center,
  onPick,
  onClose,
}: {
  initial?: [number, number];
  center?: [number, number];
  onPick: (ll: [number, number] | null) => void;
  onClose: () => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const [ll, setLl] = useState<[number, number] | undefined>(initial);
  const [ready, setReady] = useState(false);
  const mapRef = useRef<Leaflet.Map | null>(null);

  useEffect(() => {
    let cancelled = false;
    let marker: Leaflet.Marker | null = null;
    (async () => {
      const mod = await import("leaflet");
      const L = (mod.default ?? mod) as typeof Leaflet;
      if (cancelled || !el.current) return;
      const map = await createBaseMap(L, el.current);
      if (cancelled) return map.remove();
      mapRef.current = map;
      const icon = L.divIcon({ className: "pin2-wrap", html: `<div class="pin2 pick"><div class="pin2-dot">📍</div></div>`, iconSize: [0, 0] });
      const place = (p: [number, number]) => {
        if (marker) marker.setLatLng(p);
        else marker = L.marker(p, { icon, draggable: true }).addTo(map).on("dragend", () => {
          const q = marker!.getLatLng();
          setLl([q.lat, q.lng]);
        });
        setLl(p);
      };
      if (initial) {
        place(initial);
        map.setView(initial, 17);
      } else if (center) map.setView(center, 16);
      map.on("click", (e: Leaflet.LeafletMouseEvent) => place([e.latlng.lat, e.latlng.lng]));
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div className="overlay top" onClick={onClose}>
      <div className="modal picker" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="x" onClick={onClose} aria-label="close">×</button>
        <h2>Where is it? 📍</h2>
        <p className="meta">Zoom in and tap the exact spot. You can drag the pin to adjust it.</p>
        <div className="picker-map">
          <div ref={el} className="sgmap-canvas" />
          {!ready && <div className="sgmap-loading">Unfolding the map… 🗺️</div>}
          <div className="sgmap-ctl">
            <button type="button" onClick={() => mapRef.current?.zoomIn()}>+</button>
            <button type="button" onClick={() => mapRef.current?.zoomOut()}>−</button>
          </div>
        </div>
        <div className="form-actions">
          {initial && (
            <button type="button" className="btn ghost del" onClick={() => onPick(null)}>Remove pin</button>
          )}
          <span className="spacer" />
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn primary" disabled={!ll} onClick={() => ll && onPick(ll)}>Use this spot</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
