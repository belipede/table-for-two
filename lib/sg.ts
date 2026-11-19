// Singapore flavour: tags, price bands, score words, makan trails and distance helpers.
import { STATION_BY_NAME } from "./stations";
import type { Spot } from "./types";

export const TAGS: { t: string; e: string }[] = [
  { t: "Hawker", e: "🍜" },
  { t: "Kopitiam", e: "☕" },
  { t: "Zi char", e: "🦀" },
  { t: "Supper", e: "🌙" },
  { t: "Date night", e: "🕯️" },
  { t: "Brunch", e: "🥞" },
  { t: "Cafe", e: "🍰" },
  { t: "Dessert", e: "🍧" },
  { t: "Halal", e: "🟢" },
  { t: "Atas", e: "✨" },
  { t: "Hidden gem", e: "💎" },
  { t: "Worth the queue", e: "⏳" },
  { t: "Aircon", e: "❄️" },
  { t: "Rainy day", e: "☔" },
];
export const TAG_EMOJI: Record<string, string> = Object.fromEntries(TAGS.map((x) => [x.t, x.e]));
export const tagLabel = (t: string) => `${TAG_EMOJI[t] ?? "🏷️"} ${t}`;

/** $ to $$$$ in Singapore money, per person. */
export const PRICE_SG = [
  { s: "$", d: "under $10", h: "hawker" },
  { s: "$$", d: "$10–30", h: "casual" },
  { s: "$$$", d: "$30–60", h: "nice" },
  { s: "$$$$", d: "$60+", h: "atas" },
];

export function scoreWord(n: number | null | undefined): string {
  if (n == null) return "";
  if (n >= 9) return "shiok!";
  if (n >= 8) return "damn good";
  if (n >= 7) return "can lah";
  if (n >= 5.5) return "okay lor";
  if (n >= 4) return "meh";
  return "jialat";
}

export interface TrailItem {
  n: string; // place name
  k: string[]; // words that must all appear in a spot's name to count
  mrt: string; // nearest MRT (from lib/geo/stations.json)
  tags: string[];
}
export interface Trail {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  items: TrailItem[];
}

const T = (n: string, mrt: string, tags: string[], k?: string[]): TrailItem => ({
  n,
  mrt,
  tags,
  k: k ?? [n.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ").filter((w) => w.length > 2 && !["food", "centre", "the"].includes(w))[0]],
});

export const TRAILS: Trail[] = [
  {
    id: "hawker",
    name: "Hawker centre trail",
    emoji: "🍜",
    blurb: "The classic hawker centres every Singaporean has opinions about.",
    items: [
      T("Maxwell Food Centre", "Maxwell", ["Hawker"]),
      T("Lau Pa Sat", "Telok Ayer", ["Hawker"], ["lau pa sat"]),
      T("Old Airport Road Food Centre", "Dakota", ["Hawker"], ["old airport"]),
      T("Tiong Bahru Market", "Tiong Bahru", ["Hawker"], ["tiong bahru market"]),
      T("Chomp Chomp Food Centre", "Lorong Chuan", ["Hawker", "Supper"], ["chomp"]),
      T("Newton Food Centre", "Newton", ["Hawker"], ["newton food"]),
      T("Tekka Centre", "Little India", ["Hawker"], ["tekka"]),
      T("Amoy Street Food Centre", "Telok Ayer", ["Hawker"], ["amoy street"]),
      T("Adam Road Food Centre", "Botanic Gardens", ["Hawker"], ["adam road"]),
      T("Chinatown Complex Food Centre", "Chinatown", ["Hawker"], ["chinatown complex"]),
    ],
  },
  {
    id: "kopi",
    name: "Kopi & kaya toast",
    emoji: "☕",
    blurb: "Old-school breakfast: soft-boiled eggs, kaya toast, kopi siew dai.",
    items: [
      T("Ya Kun Kaya Toast", "Telok Ayer", ["Kopitiam", "Brunch"], ["ya kun"]),
      T("Killiney Kopitiam", "Somerset", ["Kopitiam", "Brunch"], ["killiney"]),
      T("Tong Ah Eating House", "Outram Park", ["Kopitiam", "Brunch"], ["tong ah"]),
      T("Chin Mee Chin Confectionery", "Marine Parade", ["Kopitiam", "Brunch"], ["chin mee chin"]),
      T("Heap Seng Leong", "Lavender", ["Kopitiam", "Hidden gem"], ["heap seng"]),
      T("Nanyang Old Coffee", "Chinatown", ["Kopitiam"], ["nanyang old"]),
    ],
  },
  {
    id: "supper",
    name: "Supper club",
    emoji: "🌙",
    blurb: "For when it's 11pm and someone says \"hungry leh\".",
    items: [
      T("Swee Choon Tim Sum", "Jalan Besar", ["Supper"], ["swee choon"]),
      T("Al-Azhar Eating Restaurant", "Beauty World", ["Supper", "Halal"], ["azhar"]),
      T("Springleaf Prata Place", "Springleaf", ["Supper", "Halal"], ["springleaf"]),
      T("Sin Ming Roti Prata", "Bright Hill", ["Supper", "Halal"], ["sin ming"]),
      T("Beach Road Scissor Cut Curry Rice", "Lavender", ["Supper", "Hawker"], ["scissor"]),
      T("Chomp Chomp Food Centre", "Lorong Chuan", ["Supper", "Hawker"], ["chomp"]),
    ],
  },
  {
    id: "crab",
    name: "Chilli crab & zi char",
    emoji: "🦀",
    blurb: "Big round tables, messy hands, extra mantou for the gravy.",
    items: [
      T("Jumbo Seafood", "Bayshore", ["Zi char", "Date night"], ["jumbo"]),
      T("Long Beach Seafood", "Bayshore", ["Zi char"], ["long beach"]),
      T("Keng Eng Kee Seafood", "Queenstown", ["Zi char"], ["keng eng kee"]),
      T("JB Ah Meng", "Aljunied", ["Zi char", "Supper"], ["ah meng"]),
      T("Mellben Seafood", "Ang Mo Kio", ["Zi char", "Worth the queue"], ["mellben"]),
      T("Red House Seafood", "Clarke Quay", ["Zi char", "Date night"], ["red house"]),
    ],
  },
  {
    id: "dessert",
    name: "Dessert hop",
    emoji: "🍧",
    blurb: "Ice kacang, chendol, gelato: one more stop, the other stomach.",
    items: [
      T("Mei Heong Yuen Dessert", "Chinatown", ["Dessert"], ["mei heong"]),
      T("Ah Chew Desserts", "Bugis", ["Dessert"], ["ah chew"]),
      T("Birds of Paradise Gelato", "Tanjong Katong", ["Dessert"], ["birds of paradise"]),
      T("Udders Ice Cream", "Upper Thomson", ["Dessert"], ["udders"]),
      T("Island Creamery", "Stevens", ["Dessert"], ["island creamery"]),
    ],
  },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ");
export const trailMatch = (item: TrailItem, spots: Spot[]) =>
  spots.find((s) => item.k.every((k) => norm(s.name).includes(norm(k).trim())));

/** Rough region for an MRT station, so trail spots land in a sensible area filter. */
export function regionFor(lat: number, lng: number): string {
  if (lat > 1.4) return "North";
  if (lng > 103.9) return "East";
  if (lng < 103.78) return "West";
  if (lat > 1.345 && lng > 103.84) return "Northeast";
  return "Central";
}
export const stationLL = (n: string) => STATION_BY_NAME[n]?.ll;

/** Metres between two points. */
export function distM(a: [number, number], b: [number, number]) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r, dLng = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const fmtDist = (m: number) => (m < 950 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);
/** Walking minutes, roughly, padded for traffic lights and void decks. */
export const walkMins = (m: number) => Math.max(1, Math.round((m * 1.3) / 80));

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const fmtDay = (iso: string, withYear = false) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-SG", { weekday: "short", day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
