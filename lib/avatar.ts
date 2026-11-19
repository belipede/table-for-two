// Little chibi avatars for the two of us, drawn as inline SVG (original art).
import type { Partner } from "./types";

export interface Avatar {
  skin: string;
  hair: string;
  style: "short" | "spiky" | "long" | "bun" | "bob";
  top: string;
  acc: string; // emoji held / worn, "" for none
}

export const SKINS = ["#ffe3cf", "#f6cfae", "#e8b48c", "#c98d62", "#9a6440"];
export const HAIRS = ["#2b2220", "#5a3a2a", "#a0643a", "#e2b25a", "#e98aa8", "#7a8cf0"];
export const TOPS = ["#ff8fab", "#7fb2ff", "#ffd166", "#8fd694", "#c3a6ff", "#ffffff", "#ff9f5a"];
export const STYLES: Avatar["style"][] = ["short", "spiky", "bob", "long", "bun"];
export const ACCS = ["", "🧋", "🍦", "🍡", "🥟", "🍜", "🌸", "🎀", "🧢", "👓"];

export const DEFAULT_AVATARS: Record<Partner, Avatar> = {
  a: { skin: SKINS[1], hair: HAIRS[0], style: "spiky", top: TOPS[1], acc: "🧋" },
  b: { skin: SKINS[0], hair: HAIRS[1], style: "long", top: TOPS[0], acc: "🎀" },
};

export function cleanAvatar(v: any, d: Avatar): Avatar {
  const pick = <T,>(x: unknown, list: readonly T[], dd: T) => (list.includes(x as T) ? (x as T) : dd);
  return {
    skin: pick(v?.skin, SKINS, d.skin),
    hair: pick(v?.hair, HAIRS, d.hair),
    style: pick(v?.style, STYLES, d.style),
    top: pick(v?.top, TOPS, d.top),
    acc: pick(v?.acc, ACCS, d.acc),
  };
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.max(0, Math.min(255, ((n >> s) & 255) + amt));
  return `#${((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, "0")}`;
}

/** 60x80 viewBox chibi. Wearables (bow/cap/glasses) are drawn; food emoji are held. */
export function avatarSvg(av: Avatar, opts: { size?: number } = {}) {
  const h = av.hair, hd = shade(h, -25), sk = av.skin, skd = shade(sk, -22), t = av.top, td = shade(t, -30);
  const size = opts.size ?? 60;
  const back =
    av.style === "long" ? `<path d="M10 30 Q8 58 16 62 L44 62 Q52 58 50 30 Z" fill="${hd}"/>`
    : av.style === "bob" ? `<path d="M9 30 Q8 46 14 48 L46 48 Q52 46 51 30 Z" fill="${hd}"/>`
    : av.style === "bun" ? `<circle cx="30" cy="7" r="7" fill="${h}"/>`
    : "";
  const fringe =
    av.style === "spiky" ? `<path d="M9 30 Q8 10 30 9 Q52 10 51 30 L46 24 L42 30 L38 22 L33 28 L29 20 L24 28 L20 22 L16 30 L13 25 Z" fill="${h}"/>`
    : av.style === "short" ? `<path d="M9 31 Q8 9 30 9 Q52 9 51 31 Q46 22 36 20 Q30 26 18 23 Q12 25 9 31 Z" fill="${h}"/>`
    : `<path d="M9 34 Q7 9 30 9 Q53 9 51 34 Q49 24 44 20 Q34 25 30 18 Q24 25 14 21 Q10 26 9 34 Z" fill="${h}"/>`;
  const wear =
    av.acc === "🎀" ? `<g transform="translate(43 13) rotate(20)"><path d="M0 0 L-8 -5 L-8 5 Z M0 0 L8 -5 L8 5 Z" fill="#ff5c8a"/><circle r="2.6" fill="#ff8fab"/></g>`
    : av.acc === "🧢" ? `<path d="M10 22 Q12 6 30 6 Q48 6 50 22 Z" fill="${t}"/><path d="M8 22 Q30 16 58 24 Q30 24 8 24 Z" fill="${td}"/>`
    : av.acc === "👓" ? `<g fill="none" stroke="#3a2a25" stroke-width="1.6"><circle cx="22" cy="33" r="5"/><circle cx="38" cy="33" r="5"/><path d="M27 33 H33"/></g>`
    : av.acc === "🌸" ? `<text x="44" y="20" font-size="11" text-anchor="middle">🌸</text>`
    : "";
  const held = av.acc && !["🎀", "🧢", "👓", "🌸"].includes(av.acc)
    ? `<text x="49" y="69" font-size="13" text-anchor="middle">${av.acc}</text>` : "";
  return `<svg viewBox="0 0 60 80" width="${size}" height="${(size * 4) / 3}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <ellipse cx="30" cy="77" rx="15" ry="3" fill="rgba(40,80,60,.22)"/>
  ${back}
  <rect x="22" y="66" width="6" height="9" rx="3" fill="${skd}"/><rect x="32" y="66" width="6" height="9" rx="3" fill="${skd}"/>
  <path d="M17 70 Q17 52 30 51 Q43 52 43 70 Z" fill="${t}"/>
  <path d="M17 70 Q17 64 30 64 Q43 64 43 70 Z" fill="${td}" opacity=".35"/>
  <ellipse cx="15.5" cy="62" rx="3.6" ry="5" fill="${t}"/><ellipse cx="44.5" cy="62" rx="3.6" ry="5" fill="${t}"/>
  <circle cx="30" cy="31" r="21" fill="${sk}"/>
  ${fringe}
  <ellipse cx="22" cy="34" rx="2.6" ry="3.3" fill="#3a2a25"/><ellipse cx="38" cy="34" rx="2.6" ry="3.3" fill="#3a2a25"/>
  <circle cx="23" cy="32.6" r="1" fill="#fff"/><circle cx="39" cy="32.6" r="1" fill="#fff"/>
  <ellipse cx="16.5" cy="40" rx="3.4" ry="2.1" fill="#ff8fa3" opacity=".55"/><ellipse cx="43.5" cy="40" rx="3.4" ry="2.1" fill="#ff8fa3" opacity=".55"/>
  <path d="M27 41 Q30 44 33 41" fill="none" stroke="#3a2a25" stroke-width="1.6" stroke-linecap="round"/>
  ${wear}
  ${held}
</svg>`;
}
