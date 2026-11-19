export type Partner = "a" | "b";
export type Status = "wishlist" | "visited";

export interface Spot {
  id: string;
  name: string;
  area: string;
  mrt?: string; // nearest MRT station
  lat?: number;
  lng?: number;
  cuisine: string[];
  price: number; // 1-4
  status: Status;
  addedBy: Partner;
  createdAt: number;
  updatedAt: number;
  mapsUrl?: string;
  dishes?: string; // must-order dishes
  ratings: Partial<Record<Partner, number>>; // 0-10
  notes: Partial<Record<Partner, string>>;
  wants: Partial<Record<Partner, boolean>>; // "I want to go too"
  visitedOn?: string; // yyyy-mm-dd
  memory?: string; // date memory
  ourSpot?: boolean; // a forever favourite
  visits?: number; // how many times we've been
  orders?: Order[]; // what we usually get
}

export interface Order {
  d: string; // the dish
  fav?: boolean; // get this again
}

export interface Settings {
  names: Record<Partner, string>;
  since?: string; // yyyy-mm-dd, together since
  avatars?: Record<Partner, import("./avatar").Avatar>;
}

export const AREAS = ["Central", "North", "Northeast", "East", "West", "Overseas"];
export const PRICE = ["$", "$$", "$$$", "$$$$"];

export function avgScore(s: Spot): number | null {
  const vals = Object.values(s.ratings).filter((v): v is number => typeof v === "number");
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}
