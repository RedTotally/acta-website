"use server";

import { redirect } from "next/navigation";

import { critiqueText } from "@/lib/critique";
import { createGroup, createUser, findUserByEmail } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { safeNext } from "@/lib/paths";
import {
  clearSessionCookie,
  getCurrentUser,
  setSessionCookie,
} from "@/lib/session";
import { submitLog } from "@/lib/submit-log";
import type { FormState, LogActionResult } from "@/lib/types";

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function isUnique(error: unknown): boolean {
  return error instanceof Error && /UNIQUE/i.test(error.message);
}

export async function signUp(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = field(formData, "name").trim();
  const email = field(formData, "email").trim().toLowerCase();
  const password = field(formData, "password");
  if (!name || name.length > 80) return { error: "Enter your name." };
  if (!email.includes("@") || !email.includes(".") || email.length > 200) {
    return { error: "Enter an email." };
  }
  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (findUserByEmail(email)) return { error: "That email already has an account." };

  let user: { id: string };
  try {
    user = createUser({ name, email, passwordHash: hashPassword(password) });
  } catch (error) {
    if (isUnique(error)) return { error: "That email already has an account." };
    throw error;
  }

  await setSessionCookie(user.id);
  redirect(safeNext(field(formData, "next")) ?? "/");
}

export async function signIn(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = field(formData, "email").trim().toLowerCase();
  const password = field(formData, "password");
  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return { error: "Email or password does not match." };
  }
  await setSessionCookie(user.id);
  redirect(safeNext(field(formData, "next")) ?? "/");
}

export async function signOut(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}

export async function createGroupAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const name = field(formData, "name").trim();
  if (!name) return { error: "Give the group a name." };
  if (name.length > 80) return { error: "Use a shorter name." };
  const group = createGroup(user.id, name);
  redirect(`/groups/${group.id}`);
}

export async function logWork(groupId: string, text: string): Promise<LogActionResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "signed-out" };
  return submitLog({
    groupId,
    userId: user.id,
    text,
    critique: critiqueText,
  });
}
