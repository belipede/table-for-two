import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { deleteSpot, getSpot, saveSpot } from "@/lib/store";
import { cleanSpot } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  if (!(await isAuthed())) return NextResponse.json({ error: "locked" }, { status: 401 });
  const { id } = await params;
  const prev = await getSpot(id);
  if (!prev) return NextResponse.json({ error: "not found" }, { status: 404 });
  const spot = cleanSpot(await req.json().catch(() => null), prev);
  if (typeof spot === "string") return NextResponse.json({ error: spot }, { status: 400 });
  await saveSpot(spot);
  return NextResponse.json(spot);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await isAuthed())) return NextResponse.json({ error: "locked" }, { status: 401 });
  const { id } = await params;
  await deleteSpot(id);
  return NextResponse.json({ ok: true });
}
