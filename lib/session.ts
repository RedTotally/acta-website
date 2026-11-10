import { cache } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";

import { createSession, deleteSession, userForSessionToken } from "@/lib/db";

const COOKIE = "acta_session";

export const getCurrentUser = cache(async () => {
  await connection();
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return userForSessionToken(token);
});

export async function setSessionCookie(userId: string): Promise<void> {
  const token = createSession(userId);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) deleteSession(token);
  jar.delete({ name: COOKIE, path: "/" });
}
