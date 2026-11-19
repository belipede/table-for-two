import raw from "./geo/stations.json";

export interface Station {
  n: string; // name
  k: string[]; // codes, e.g. ["NS24","NE6","CC1"]
  ll: [number, number]; // lat, lng
  lrt: boolean;
}

export const STATIONS_LIST = raw as Station[];
export const STATION_BY_NAME: Record<string, Station> = Object.fromEntries(STATIONS_LIST.map((s) => [s.n, s]));
export const STATION_NAMES = STATIONS_LIST.map((s) => s.n);

export const LINE_COLORS: Record<string, string> = {
  NS: "#d42e12", EW: "#009645", CG: "#009645", NE: "#9900aa", CC: "#fa9e0d", CE: "#fa9e0d",
  DT: "#005ec4", TE: "#9d5b25",
};
export const codeColor = (code: string) => LINE_COLORS[code.replace(/\d+$/, "")] ?? "#8b8b8b";

// Singapore, roughly
export const SG_BOUNDS = { south: 1.15, north: 1.48, west: 103.6, east: 104.1 };
export const inSg = (lat: number, lng: number) =>
  lat >= SG_BOUNDS.south && lat <= SG_BOUNDS.north && lng >= SG_BOUNDS.west && lng <= SG_BOUNDS.east;

/** Pull coordinates out of a pasted Google Maps URL, when it has them. */
export function coordsFromMapsUrl(url: string): [number, number] | null {
  const pats = [/@(-?\d+\.\d+),(-?\d+\.\d+)/, /[?&](?:q|query|ll|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/];
  for (const p of pats) {
    const m = url.match(p);
    if (m) {
      const lat = Number(m[1]), lng = Number(m[2]);
      if (inSg(lat, lng)) return [lat, lng];
    }
  }
  return null;
}
