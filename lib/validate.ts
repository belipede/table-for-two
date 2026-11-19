import type { Partner, Spot } from "./types";
import { STATIONS } from "./mrt";

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
    mrt: typeof input?.mrt === "string" && STATIONS[input.mrt] ? input.mrt : undefined,
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
