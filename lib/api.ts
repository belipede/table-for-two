"use client";
import type { Partner, Settings, Spot } from "./types";

/** Data access used by the UI. The Next.js build talks to /api; the
 *  Claude-hosted build swaps in a realtime database (see artifact/main.tsx). */
export interface Api {
  subscribeSpots(cb: (spots: Spot[]) => void): () => void;
  subscribeSettings(cb: (s: Settings) => void): () => void;
  saveSpot(data: Partial<Spot>): Promise<Spot>;
  deleteSpot(id: string): Promise<void>;
  saveSettings(s: Settings): Promise<Settings>;
  getMe(): Promise<Partner | null>;
  setMe(p: Partner): Promise<void>;
}

const ls = {
  get(k: string) {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  set(k: string, v: string) {
    try { localStorage.setItem(k, v); } catch { /* storage blocked */ }
  },
};
export { ls };

const json = (body: unknown) => ({
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const httpApi: Api = {
  subscribeSpots(cb) {
    const load = async () => {
      const res = await fetch("/api/spots", { cache: "no-store" });
      if (res.ok) cb(await res.json());
    };
    const t = setInterval(load, 20000);
    window.addEventListener("focus", load);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", load);
    };
  },
  subscribeSettings() {
    return () => {};
  },
  async saveSpot(data) {
    const res = await fetch(data.id ? `/api/spots/${data.id}` : "/api/spots", {
      method: data.id ? "PUT" : "POST",
      ...json(data),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Couldn't save");
    return body;
  },
  async deleteSpot(id) {
    await fetch(`/api/spots/${id}`, { method: "DELETE" });
  },
  async saveSettings(s) {
    const res = await fetch("/api/settings", { method: "PUT", ...json(s) });
    if (!res.ok) throw new Error("Couldn't save");
    return res.json();
  },
  async getMe() {
    const v = ls.get("t42_me");
    return v === "a" || v === "b" ? v : null;
  },
  async setMe(p) {
    ls.set("t42_me", p);
  },
};

let current: Api = httpApi;
export const setApi = (a: Api) => (current = a);
export const api = () => current;
