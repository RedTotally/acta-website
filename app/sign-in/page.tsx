import { Suspense } from "react";

import { SignInForm } from "@/components/auth-forms";
import { safeNext } from "@/lib/paths";

export default function SignInPage(props: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  return (
    <main className="mx-auto max-w-xl p-4">
      <h1>Sign in</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <SignInSearch params={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function SignInSearch({
  params,
}: {
  params: Promise<{ next?: string | string[] }>;
}) {
  const search = await params;
  const next = safeNext(typeof search.next === "string" ? search.next : null);
  return <SignInForm next={next} />;
}
