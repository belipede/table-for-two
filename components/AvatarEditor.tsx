"use client";
import { ACCS, HAIRS, SKINS, STYLES, TOPS, avatarSvg, type Avatar } from "@/lib/avatar";

const STYLE_LABEL: Record<Avatar["style"], string> = { short: "Short", spiky: "Spiky", bob: "Bob", long: "Long", bun: "Bun" };

export function AvatarImg({ av, size = 48, className = "" }: { av: Avatar; size?: number; className?: string }) {
  return <span className={`avatar-img ${className}`} dangerouslySetInnerHTML={{ __html: avatarSvg(av, { size }) }} />;
}

export default function AvatarEditor({ name, av, onChange }: { name: string; av: Avatar; onChange: (a: Avatar) => void }) {
  const set = (p: Partial<Avatar>) => onChange({ ...av, ...p });
  const swatches = (list: string[], key: "skin" | "hair" | "top") => (
    <div className="sw-row">
      {list.map((c) => (
        <button type="button" key={c} className={`sw ${av[key] === c ? "on" : ""}`} style={{ background: c }}
          onClick={() => set({ [key]: c } as Partial<Avatar>)} aria-label={`${key} ${c}`} />
      ))}
    </div>
  );
  return (
    <div className="av-edit">
      <div className="av-preview">
        <AvatarImg av={av} size={72} />
        <span>{name || "?"}</span>
      </div>
      <div className="av-opts">
        <div className="av-line"><small>Skin</small>{swatches(SKINS, "skin")}</div>
        <div className="av-line"><small>Hair</small>{swatches(HAIRS, "hair")}</div>
        <div className="av-line">
          <small>Style</small>
          <div className="sw-row">
            {STYLES.map((s) => (
              <button type="button" key={s} className={`chip-btn ${av.style === s ? "on" : ""}`} onClick={() => set({ style: s })}>{STYLE_LABEL[s]}</button>
            ))}
          </div>
        </div>
        <div className="av-line"><small>Top</small>{swatches(TOPS, "top")}</div>
        <div className="av-line">
          <small>Extra</small>
          <div className="sw-row">
            {ACCS.map((e) => (
              <button type="button" key={e || "none"} className={`chip-btn emo ${av.acc === e ? "on" : ""}`} onClick={() => set({ acc: e })}>{e || "none"}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
