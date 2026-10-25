import { cookies } from "next/headers";

const COOKIE = "g2m_uid";
const UID = /^[a-z0-9]{24}$/;
const YEAR = 60 * 60 * 24 * 365;

// Server-only: the anonymous visitor id lives in an httpOnly cookie, never in client JS.
export async function getUid() {
  const uid = (await cookies()).get(COOKIE)?.value;
  return uid && UID.test(uid) ? uid : null;
}

export async function setUid(uid: string) {
  (await cookies()).set(COOKIE, uid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: YEAR,
    path: "/",
  });
}

export function newUid() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function noSession() {
  return Response.json(
    { success: false, data: null, error: "Your session expired. Reload the page." },
    { status: 401 },
  );
}
