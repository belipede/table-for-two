// A hand-drawn, schematic MRT map. Coordinates are grid units, not geography.
// Lines reference stations by name, so interchanges always line up.
// "@x,y" entries are bends with no station.

export const STATIONS: Record<string, [number, number]> = {
  // North–South
  "Jurong East": [14, 40], "Bukit Batok": [14, 35], "Bukit Gombak": [14, 30], "Choa Chu Kang": [14, 25],
  "Yew Tee": [14, 20], Kranji: [17, 14], Marsiling: [21, 10], Woodlands: [25, 8], Admiralty: [29, 6],
  Sembawang: [33, 4], Canberra: [37, 4], Yishun: [42, 4], Khatib: [46, 6], "Yio Chu Kang": [50, 10],
  "Ang Mo Kio": [50, 14], Bishan: [50, 18], Braddell: [50, 22], "Toa Payoh": [50, 26], Novena: [50, 30],
  Newton: [50, 34], Orchard: [50, 38], Somerset: [53, 41], "Dhoby Ghaut": [56, 44], "City Hall": [59, 47],
  "Raffles Place": [59, 51], "Marina Bay": [59, 55], "Marina South Pier": [59, 59],
  // East–West
  "Tuas Link": [-13, 40], "Tuas West Road": [-10, 40], "Tuas Crescent": [-7, 40], "Gul Circle": [-4, 40],
  "Joo Koon": [-1, 40], Pioneer: [2, 40], "Boon Lay": [5, 40], Lakeside: [8, 40], "Chinese Garden": [11, 40],
  Clementi: [18, 44], Dover: [21.5, 47.5], "Buona Vista": [25, 51], Commonwealth: [29, 51], Queenstown: [33, 51],
  Redhill: [37, 51], "Tiong Bahru": [41, 51], "Outram Park": [46, 51], "Tanjong Pagar": [52.5, 51],
  Bugis: [63, 43], Lavender: [66, 40], Kallang: [69, 37], Aljunied: [72, 34], "Paya Lebar": [76, 34],
  Eunos: [80, 34], Kembangan: [84, 34], Bedok: [88, 34], "Tanah Merah": [92, 34], Simei: [95, 31],
  Tampines: [98, 28], "Pasir Ris": [101, 25], Expo: [96, 38], "Changi Airport": [100, 42],
  // North East
  HarbourFront: [43, 65], Chinatown: [49, 48], "Clarke Quay": [53, 44], "Little India": [56, 38],
  "Farrer Park": [56, 34], "Boon Keng": [56, 30], "Potong Pasir": [56, 26], Woodleigh: [60, 22],
  Serangoon: [64, 18], Kovan: [68, 14], Hougang: [72, 10], Buangkok: [76, 6], Sengkang: [80, 2],
  Punggol: [84, -2], "Punggol Coast": [88, -6],
  // Circle
  "Bras Basah": [60, 44], Esplanade: [63, 46], Promenade: [66, 46], "Nicoll Highway": [69, 46],
  Stadium: [72, 46], Mountbatten: [74, 44], Dakota: [76, 42], MacPherson: [76, 30], "Tai Seng": [73, 27],
  Bartley: [70, 24], "Lorong Chuan": [57, 18], Marymount: [45, 23], Caldecott: [40, 28],
  "Botanic Gardens": [40, 34], "Farrer Road": [35, 41], "Holland Village": [30, 46], "one-north": [25, 55],
  "Kent Ridge": [25, 59], "Haw Par Villa": [28, 62], "Pasir Panjang": [31, 65], "Labrador Park": [35, 65],
  "Telok Blangah": [39, 65], Bayfront: [66, 50],
  // Downtown
  "Bukit Panjang": [18, 21], Cashew: [20.5, 23.5], Hillview: [23, 26], Hume: [25.5, 28.5],
  "Beauty World": [28, 31], "King Albert Park": [31, 34], "Sixth Avenue": [34, 34], "Tan Kah Kee": [37, 34],
  Stevens: [45, 34], Rochor: [58, 38], Downtown: [63, 53], "Telok Ayer": [55, 53], "Fort Canning": [54, 48],
  Bencoolen: [60, 41], "Jalan Besar": [62, 37], Bendemeer: [63, 33], "Geylang Bahru": [66, 30],
  Mattar: [71, 30], Ubi: [80, 30], "Kaki Bukit": [84, 30], "Bedok North": [88, 30],
  "Bedok Reservoir": [91, 28], "Tampines West": [94.5, 28], "Tampines East": [101, 31], "Upper Changi": [101, 35],
  // Thomson–East Coast
  "Woodlands North": [25, 4], "Woodlands South": [28, 11], Springleaf: [31, 14], Lentor: [34, 17],
  Mayflower: [37, 20], "Bright Hill": [40, 23], "Upper Thomson": [40, 25.5], Napier: [45, 36.5],
  "Orchard Boulevard": [47.5, 38], "Great World": [47, 42], Havelock: [46, 46], Maxwell: [50, 54],
  "Shenton Way": [54, 56], "Gardens by the Bay": [63, 58], "Tanjong Rhu": [67, 58], "Katong Park": [71, 58],
  "Tanjong Katong": [75, 58], "Marine Parade": [79, 58], "Marine Terrace": [83, 58], Siglap: [87, 58],
  Bayshore: [91, 58],
};

export interface Line {
  code: string;
  name: string;
  color: string;
  paths: string[][];
}

export const LINES: Line[] = [
  {
    code: "NS", name: "North South", color: "#d42e12",
    paths: [["Jurong East", "Bukit Batok", "Bukit Gombak", "Choa Chu Kang", "Yew Tee", "Kranji", "Marsiling",
      "Woodlands", "Admiralty", "Sembawang", "Canberra", "Yishun", "Khatib", "Yio Chu Kang", "Ang Mo Kio",
      "Bishan", "Braddell", "Toa Payoh", "Novena", "Newton", "Orchard", "Somerset", "Dhoby Ghaut", "City Hall",
      "Raffles Place", "Marina Bay", "Marina South Pier"]],
  },
  {
    code: "EW", name: "East West", color: "#009645",
    paths: [
      ["Tuas Link", "Tuas West Road", "Tuas Crescent", "Gul Circle", "Joo Koon", "Pioneer", "Boon Lay", "Lakeside",
        "Chinese Garden", "Jurong East", "Clementi", "Dover", "Buona Vista", "Commonwealth", "Queenstown", "Redhill",
        "Tiong Bahru", "Outram Park", "Tanjong Pagar", "Raffles Place", "City Hall", "Bugis", "Lavender", "Kallang",
        "Aljunied", "Paya Lebar", "Eunos", "Kembangan", "Bedok", "Tanah Merah", "Simei", "Tampines", "Pasir Ris"],
      ["Tanah Merah", "Expo", "Changi Airport"],
    ],
  },
  {
    code: "NE", name: "North East", color: "#9900aa",
    paths: [["HarbourFront", "@43,54", "Outram Park", "Chinatown", "Clarke Quay", "Dhoby Ghaut", "Little India",
      "Farrer Park", "Boon Keng", "Potong Pasir", "Woodleigh", "Serangoon", "Kovan", "Hougang", "Buangkok",
      "Sengkang", "Punggol", "Punggol Coast"]],
  },
  {
    code: "CC", name: "Circle", color: "#fa9e0d",
    paths: [
      ["Dhoby Ghaut", "Bras Basah", "Esplanade", "Promenade", "Nicoll Highway", "Stadium", "Mountbatten", "Dakota",
        "Paya Lebar", "MacPherson", "Tai Seng", "Bartley", "Serangoon", "Lorong Chuan", "Bishan", "Marymount",
        "Caldecott", "Botanic Gardens", "@40,36", "Farrer Road", "Holland Village", "Buona Vista", "one-north",
        "Kent Ridge", "Haw Par Villa", "Pasir Panjang", "Labrador Park", "Telok Blangah", "HarbourFront"],
      ["Promenade", "Bayfront", "Marina Bay"],
    ],
  },
  {
    code: "DT", name: "Downtown", color: "#005ec4",
    paths: [["Bukit Panjang", "Cashew", "Hillview", "Hume", "Beauty World", "King Albert Park", "Sixth Avenue",
      "Tan Kah Kee", "Botanic Gardens", "Stevens", "Newton", "Little India", "Rochor", "Bugis", "Promenade",
      "Bayfront", "Downtown", "Telok Ayer", "Chinatown", "Fort Canning", "Bencoolen", "Jalan Besar", "Bendemeer",
      "Geylang Bahru", "Mattar", "MacPherson", "Ubi", "Kaki Bukit", "Bedok North", "Bedok Reservoir",
      "Tampines West", "Tampines", "Tampines East", "Upper Changi", "Expo"]],
  },
  {
    code: "TE", name: "Thomson–East Coast", color: "#9d5b25",
    paths: [["Woodlands North", "Woodlands", "Woodlands South", "Springleaf", "Lentor", "Mayflower", "Bright Hill",
      "Upper Thomson", "Caldecott", "Stevens", "Napier", "Orchard Boulevard", "Orchard", "Great World", "Havelock",
      "Outram Park", "Maxwell", "Shenton Way", "Marina Bay", "Gardens by the Bay", "Tanjong Rhu", "Katong Park",
      "Tanjong Katong", "Marine Parade", "Marine Terrace", "Siglap", "Bayshore"]],
  },
];

export const STATION_NAMES = Object.keys(STATIONS).sort((a, b) => a.localeCompare(b));

/** Which lines stop at each station. */
export const STATION_LINES: Record<string, Line[]> = (() => {
  const out: Record<string, Line[]> = {};
  for (const l of LINES)
    for (const p of l.paths)
      for (const s of p)
        if (!s.startsWith("@")) {
          out[s] ??= [];
          if (!out[s].includes(l)) out[s].push(l);
        }
  return out;
})();

export function pointOf(s: string): [number, number] {
  if (s.startsWith("@")) {
    const [x, y] = s.slice(1).split(",").map(Number);
    return [x, y];
  }
  return STATIONS[s];
}
