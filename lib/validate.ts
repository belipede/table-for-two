import { cleanAvatar, DEFAULT_AVATARS } from "./avatar";
import type { Partner, Plan, Settings, Spot } from "./types";
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
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function cleanSpot(input: any, prev?: Spot): Spot | string {
  const name = str(input?.name, 120);
  if (!name) return "Give the place a name";
  const now = Date.now();
  const mapsUrl = str(input?.mapsUrl, 500);
  const visited = input?.status === "visited";
  const visitedOn = typeof input?.visitedOn === "string" && DAY.test(input.visitedOn) ? input.visitedOn : undefined;
  let visitLog: string[] = Array.isArray(input?.visitLog)
    ? [...new Set<string>(input.visitLog.filter((d: unknown) => typeof d === "string" && DAY.test(d)))]
    : [];
  // first time we mark it as been (or an older spot with no log yet): log that day
  if (visited && visitedOn && (prev?.status !== "visited" || !visitLog.length) && !visitLog.includes(visitedOn))
    visitLog.push(visitedOn);
  visitLog = visited ? visitLog.sort().slice(-300) : [];
  const tags: string[] = Array.isArray(input?.tags)
    ? [...new Set<string>(input.tags.map((t: unknown) => str(t, 24)).filter(Boolean) as string[])].slice(0, 8)
    : [];
  const photos: string[] = Array.isArray(input?.photos)
    ? input.photos.filter((p: unknown) => typeof p === "string" && /^[\w.-]{1,120}$/.test(p)).slice(0, 6)
    : [];
  return {
    id: prev?.id ?? crypto.randomUUID(),
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
    addedBy: input?.addedBy === "a" || input?.addedBy === "b" ? input.addedBy : prev?.addedBy ?? "a",
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
    visitedOn,
    memory: str(input?.memory, 2000),
    ourSpot: input?.ourSpot === true || undefined,
    visits: visited ? Math.max(1, visitLog.length, Math.round(num(input?.visits, 0, 999) ?? 1)) : undefined,
    tags: tags.length ? tags : undefined,
    photos: photos.length ? photos : undefined,
    visitLog: visitLog.length ? visitLog : undefined,
    orders: Array.isArray(input?.orders)
      ? input.orders
          .map((o: any) => ({ d: str(o?.d, 40), ...(o?.fav === true ? { fav: true } : {}) }))
          .filter((o: { d?: string }) => o.d)
          .slice(0, 12)
      : undefined,
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

export function cleanPlan(input: any, prev?: Plan): Plan | string {
  const on = typeof input?.on === "string" && DAY.test(input.on) ? input.on : undefined;
  if (!on) return "Pick a day";
  const title = str(input?.title, 80);
  if (!title) return "Give it a name";
  const kind = input?.kind === "activity" || input?.kind === "popup" ? input.kind : "makan";
  return {
    id: prev?.id ?? (typeof input?.id === "string" && /^[\w-]{1,60}$/.test(input.id) ? input.id : crypto.randomUUID()),
    createdAt: prev?.createdAt ?? Date.now(),
    createdBy: prev?.createdBy ?? partner(input?.createdBy),
    on,
    title,
    kind,
    ...(typeof input?.at === "string" && /^\d{2}:\d{2}$/.test(input.at) ? { at: input.at } : {}),
    ...(typeof input?.spotId === "string" && /^[\w-]{1,60}$/.test(input.spotId) ? { spotId: input.spotId } : {}),
    ...(str(input?.theme, 40) ? { theme: str(input?.theme, 40) } : {}),
    ...(str(input?.note, 200) ? { note: str(input?.note, 200) } : {}),
  };
}
