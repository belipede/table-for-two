import { isAuthed } from "@/lib/auth";
import { getSettings, listSpots, usingCloudStore } from "@/lib/store";
import Login from "@/components/Login";
import FoodApp from "@/components/FoodApp";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (process.env.VERCEL && !usingCloudStore) {
    return (
      <main className="login">
        <div className="login-card">
          <div className="login-emoji">🔌</div>
          <h1>Almost there</h1>
          <p>
            Connect an Upstash Redis database to this Vercel project (Storage tab → Upstash for Redis), then
            redeploy. That's where our list gets saved.
          </p>
        </div>
      </main>
    );
  }
  if (!(await isAuthed())) return <Login />;
  const [spots, settings] = await Promise.all([listSpots(), getSettings()]);
  return <FoodApp initialSpots={spots} initialSettings={settings} />;
}
