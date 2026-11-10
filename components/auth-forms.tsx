"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signIn, signUp } from "@/app/actions";

function nextHref(path: string, next: string | null): string {
  if (!next) return path;
  return `${path}?next=${encodeURIComponent(next)}`;
}

export function SignInForm({ next }: { next: string | null }) {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="surface rounded-sm border p-4">
      {next ? <input type="hidden" name="next" value={next} className="rounded-sm" /> : null}
      <label htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        className="rounded-sm border my-2 block w-full px-2 py-1"
      />
      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        className="rounded-sm border my-2 block w-full px-2 py-1"
      />
      {state?.error ? <p>{state.error}</p> : null}
      <button className="rounded-sm border px-3 py-2" type="submit" disabled={pending}>
        Sign in
      </button>
      <p>
        <Link className="rounded-sm" href={nextHref("/sign-up", next)}>
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm({ next }: { next: string | null }) {
  const [state, action, pending] = useActionState(signUp, null);
  return (
    <form action={action} className="surface rounded-sm border p-4">
      {next ? <input type="hidden" name="next" value={next} className="rounded-sm" /> : null}
      <label htmlFor="name">Name</label>
      <input
        id="name"
        name="name"
        autoComplete="name"
        className="rounded-sm border my-2 block w-full px-2 py-1"
      />
      <label htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        className="rounded-sm border my-2 block w-full px-2 py-1"
      />
      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        className="rounded-sm border my-2 block w-full px-2 py-1"
      />
      {state?.error ? <p>{state.error}</p> : null}
      <button className="rounded-sm border px-3 py-2" type="submit" disabled={pending}>
        Create an account
      </button>
      <p>
        <Link className="rounded-sm" href={nextHref("/sign-in", next)}>
          Sign in
        </Link>
      </p>
    </form>
  );
}
