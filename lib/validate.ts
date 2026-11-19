import { cleanAvatar, DEFAULT_AVATARS } from "./avatar";
import type { Partner, Settings, Spot } from "./types";
import { STATION_BY_NAME, inSg } from "./stations";

const str = (v: unknown, max = 2000) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
const num = (v: unknown, min: number, max: number) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n * 2) / 2)) : undefined;
};
const partner = (v: unknown): Partner => (v === "b" ? "b" : "a");
const perPartner = <T>(v: unknown, f: (x: unknown) => T | undefined) => {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const out: Partial<Record<Partner, T>> = {};
  for (const p of ["a", "b"] as const) {
    const val = f(o[p]);
    if (val !== undefined) out[p] = val;
  }
  return out;
};

/** Build a clean Spot from untrusted input, keeping server-owned fields from `prev`. */
export function cleanSpot(input: any, prev?: Spot): Spot | string {
  const name = str(input?.name, 120);
  if (!name) return "Give the place a name";
  const now = Date.now();
  const mapsUrl = str(input?.mapsUrl, 500);
  return {
    id: prev?.id ?? crypto.randomUUID(),
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
    addedBy: prev?.addedBy ?? partner(input?.addedBy),
    name,
    area: str(input?.area, 40) ?? "Central",
    mrt: typeof input?.mrt === "string" && STATION_BY_NAME[input.mrt] ? input.mrt : undefined,
    ...(typeof input?.lat === "number" && typeof input?.lng === "number" && inSg(input.lat, input.lng)
      ? { lat: Math.round(input.lat * 1e6) / 1e6, lng: Math.round(input.lng * 1e6) / 1e6 }
      : {}),
    cuisine: Array.isArray(input?.cuisine)
      ? input.cuisine.map((c: unknown) => str(c, 30)).filter(Boolean).slice(0, 8)
      : [],
    price: num(input?.price, 1, 4) ?? 2,
    status: input?.status === "visited" ? "visited" : "wishlist",
    mapsUrl: mapsUrl && /^https?:\/\//i.test(mapsUrl) ? mapsUrl : undefined,
    dishes: str(input?.dishes, 500),
    ratings: perPartner(input?.ratings, (x) => num(x, 0, 10)),
    notes: perPartner(input?.notes, (x) => str(x, 1000)),
    wants: perPartner(input?.wants, (x) => (x === true ? true : undefined)),
    visitedOn: str(input?.visitedOn, 10),
    memory: str(input?.memory, 2000),
    ourSpot: input?.ourSpot === true || undefined,
  };
}

export function cleanSettings(body: any): Settings {
  const name = (v: unknown, d: string) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, 30) : d;
  const since =
    typeof body?.since === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.since) ? body.since : undefined;
  const avatars = {
    a: cleanAvatar(body?.avatars?.a, DEFAULT_AVATARS.a),
    b: cleanAvatar(body?.avatars?.b, DEFAULT_AVATARS.b),
  };
  return { names: { a: name(body?.names?.a, "Ben"), b: name(body?.names?.b, "Ris") }, ...(since ? { since } : {}), avatars };
}
