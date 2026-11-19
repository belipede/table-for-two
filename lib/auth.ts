import "server-only";
import { cookies } from "next/headers";
import { createHash } from "crypto";

export const COOKIE = "t42_key";

export function passcodeHash(): string | null {
  const p = process.env.APP_PASSCODE;
  if (!p) return null;
  return createHash("sha256").update("table-for-two:" + p).digest("hex");
}

export function hashOf(input: string) {
  return createHash("sha256").update("table-for-two:" + input).digest("hex");
}

/** True when no passcode is configured, or the visitor has the right cookie. */
export async function isAuthed(): Promise<boolean> {
  const expected = passcodeHash();
  if (!expected) return true;
  const jar = await cookies();
  return jar.get(COOKIE)?.value === expected;
}
