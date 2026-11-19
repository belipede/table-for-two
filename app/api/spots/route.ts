import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { listSpots, saveSpot } from "@/lib/store";
import { cleanSpot } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "locked" }, { status: 401 });
  return NextResponse.json(await listSpots());
}

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "locked" }, { status: 401 });
  const spot = cleanSpot(await req.json().catch(() => null));
  if (typeof spot === "string") return NextResponse.json({ error: spot }, { status: 400 });
  await saveSpot(spot);
  return NextResponse.json(spot);
}
