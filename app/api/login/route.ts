import { NextResponse } from "next/server";
import { COOKIE, hashOf, passcodeHash } from "@/lib/auth";

export async function POST(req: Request) {
  const { passcode } = await req.json().catch(() => ({ passcode: "" }));
  const expected = passcodeHash();
  if (!expected || hashOf(String(passcode ?? "").trim()) !== expected) {
    return NextResponse.json({ error: "That's not our secret word 🙈" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
