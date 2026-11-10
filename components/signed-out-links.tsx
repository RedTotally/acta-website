"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function SignedOutLinks() {
  const next = useSearchParams().get("next");
  const withNext = (path: string) =>
    next ? `${path}?next=${encodeURIComponent(next)}` : path;

  return (
    <p>
      <Link className="rounded-sm" href={withNext("/sign-in")}>
        Sign in
      </Link>
      {" · "}
      <Link className="rounded-sm" href={withNext("/sign-up")}>
        Create an account
      </Link>
    </p>
  );
}
