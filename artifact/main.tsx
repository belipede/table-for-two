// Entry for the Claude-hosted single-page build (npm run build:page).
// Same UI as the Next.js app, but data lives in the page's shared realtime db.
import { createRoot } from "react-dom/client";
import FoodApp from "@/components/FoodApp";
import { ls, setApi, type Api } from "@/lib/api";
import { cleanSettings, cleanSpot } from "@/lib/validate";
import type { Partner, Settings, Spot } from "@/lib/types";

declare global {
  interface Window {
    claude?: { use(name: string): Promise<any> };
  }
}

const DEFAULT_SETTINGS: Settings = { names: { a: "Ben", b: "Ris" } };
const plain = <T,>(o: T): T => JSON.parse(JSON.stringify(o));
const root = createRoot(document.getElementById("root")!);

function Notice({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <main className="login">
      <div className="login-card">
        <div className="login-emoji">{emoji}</div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
    </main>
  );
}

async function waitForClaude(): Promise<Window["claude"] | null> {
  for (let i = 0; i < 100; i++) {
    if (window.claude?.use) return window.claude;
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

async function boot() {
  root.render(<Notice emoji="🍜" title="Table for Two" text="Setting the table…" />);
  const claude = await waitForClaude();
  const [db, user] = claude
    ? await Promise.all([claude.use("db"), claude.use("user")])
    : [null, null];
  if (!db) {
    root.render(
      <Notice emoji="🔒" title="Just for us" text="Sign in to Claude with the account this list was shared with, then open it again." />
    );
    return;
  }
  const uid: string | null = user ? await user.id().catch(() => null) : null;
  const canWrite: boolean | null = user?.can ? await Promise.resolve(user.can("data.write")).catch(() => null) : null;

  const spotsCol = db.collection("spots");
  const settingsDoc = db.doc("meta/settings");
  const prefsDoc = uid ? db.doc(`data/users/${uid}/prefs`) : null;

  const dbApi: Api = {
    subscribeSpots(cb) {
      return spotsCol.onSnapshot(
        (snap: any) => cb(snap.docs.map((d: any) => ({ ...(d.data() as Spot), id: d.id }))),
        () => {}
      );
    },
    subscribeSettings(cb) {
      return settingsDoc.onSnapshot(
        (d: any) => cb(d.exists ? cleanSettings(d.data()) : DEFAULT_SETTINGS),
        () => {}
      );
    },
    async saveSpot(data) {
      let prev: Spot | undefined;
      if (data.id) {
        const snap = await spotsCol.doc(data.id).get();
        if (snap.exists) prev = { ...(snap.data() as Spot), id: data.id };
      }
      const spot = cleanSpot(data, prev);
      if (typeof spot === "string") throw new Error(spot);
      try {
        await spotsCol.doc(spot.id).set(plain(spot));
      } catch (e: any) {
        throw new Error(
          e?.code === "invalid_argument" && canWrite !== true
            ? "You can look but not edit yet. Ask Ben to share it with you as an Editor."
            : "Couldn't save, try again in a sec"
        );
      }
      return spot;
    },
    async deleteSpot(id) {
      await spotsCol.doc(id).delete();
    },
    async saveSettings(s) {
      const clean = cleanSettings(s);
      await settingsDoc.set(plain(clean));
      return clean;
    },
    async getMe() {
      if (prefsDoc) {
        const d = await prefsDoc.get().catch(() => null);
        const me = d?.exists ? (d.data() as any).me : null;
        if (me === "a" || me === "b") return me;
      }
      const v = ls.get("t42_me");
      return v === "a" || v === "b" ? v : null;
    },
    async setMe(p: Partner) {
      ls.set("t42_me", p);
      if (prefsDoc) await prefsDoc.set({ me: p }).catch(() => {});
    },
  };
  setApi(dbApi);

  // wait (up to 10 s) for the first real data so the page doesn't flash empty
  const first = await new Promise<{ spots: Spot[]; settings: Settings }>((resolve) => {
    let spots: Spot[] | null = null;
    let settings: Settings | null = null;
    const done = () => {
      if (spots && settings) {
        clearTimeout(t);
        u1();
        u2();
        resolve({ spots, settings });
      }
    };
    const t = setTimeout(() => {
      u1();
      u2();
      resolve({ spots: spots ?? [], settings: settings ?? DEFAULT_SETTINGS });
    }, 10000);
    const u1 = spotsCol.onSnapshot(
      (snap: any) => {
        if (snap.metadata.fromCache && !spots) spots = null;
        spots = snap.docs.map((d: any) => ({ ...(d.data() as Spot), id: d.id }));
        if (!snap.metadata.fromCache) done();
      },
      () => { spots = spots ?? []; done(); }
    );
    const u2 = settingsDoc.onSnapshot(
      (d: any) => {
        settings = d.exists ? cleanSettings(d.data()) : DEFAULT_SETTINGS;
        if (!d.metadata.fromCache) done();
      },
      () => { settings = settings ?? DEFAULT_SETTINGS; done(); }
    );
  });

  root.render(<FoodApp initialSpots={first.spots} initialSettings={first.settings} />);
}

boot();
