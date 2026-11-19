import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { saveSettings } from "@/lib/store";

export async function PUT(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "locked" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const clean = (v: unknown, d: string) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, 30) : d;
  const settings = {
    names: { a: clean(body?.names?.a, "Me"), b: clean(body?.names?.b, "You") },
    since: typeof body?.since === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.since) ? body.since : undefined,
  };
  await saveSettings(settings);
  return NextResponse.json(settings);
}
