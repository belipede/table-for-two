import "server-only";
import { Redis } from "@upstash/redis";
import { promises as fs } from "fs";
import path from "path";
import type { Settings, Spot } from "./types";

const DEFAULT_SETTINGS: Settings = { names: { a: "Ben", b: "Ris" } };

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

export const usingCloudStore = !!redis;

// ---- local file fallback (for `npm run dev` without a database) ----
const FILE = path.join(process.cwd(), ".data", "db.json");
type FileDb = { spots: Record<string, Spot>; settings: Settings };
async function readFile(): Promise<FileDb> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return { spots: {}, settings: DEFAULT_SETTINGS };
  }
}
async function writeFile(db: FileDb) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db, null, 2));
}

const SPOTS = "t42:spots";
const SETTINGS = "t42:settings";

export async function listSpots(): Promise<Spot[]> {
  if (redis) {
    const all = await redis.hgetall<Record<string, Spot>>(SPOTS);
    return Object.values(all ?? {});
  }
  return Object.values((await readFile()).spots);
}

export async function getSpot(id: string): Promise<Spot | null> {
  if (redis) return (await redis.hget<Spot>(SPOTS, id)) ?? null;
  return (await readFile()).spots[id] ?? null;
}

export async function saveSpot(spot: Spot) {
  if (redis) {
    await redis.hset(SPOTS, { [spot.id]: spot });
    return;
  }
  const db = await readFile();
  db.spots[spot.id] = spot;
  await writeFile(db);
}

export async function deleteSpot(id: string) {
  if (redis) {
    await redis.hdel(SPOTS, id);
    return;
  }
  const db = await readFile();
  delete db.spots[id];
  await writeFile(db);
}

export async function getSettings(): Promise<Settings> {
  if (redis) return (await redis.get<Settings>(SETTINGS)) ?? DEFAULT_SETTINGS;
  return (await readFile()).settings ?? DEFAULT_SETTINGS;
}

export async function saveSettings(s: Settings) {
  if (redis) {
    await redis.set(SETTINGS, s);
    return;
  }
  const db = await readFile();
  db.settings = s;
  await writeFile(db);
}
