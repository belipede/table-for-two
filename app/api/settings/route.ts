import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { saveSettings } from "@/lib/store";
import { cleanSettings } from "@/lib/validate";

export async function PUT(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "locked" }, { status: 401 });
  const settings = cleanSettings(await req.json().catch(() => ({})));
  await saveSettings(settings);
  return NextResponse.json(settings);
}
