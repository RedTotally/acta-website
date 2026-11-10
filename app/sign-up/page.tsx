import { Suspense } from "react";

import { SignUpForm } from "@/components/auth-forms";
import { safeNext } from "@/lib/paths";

export default function SignUpPage(props: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  return (
    <main className="mx-auto max-w-xl p-4">
      <h1>Create an account</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <SignUpSearch params={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function SignUpSearch({
  params,
}: {
  params: Promise<{ next?: string | string[] }>;
}) {
  const search = await params;
  const next = safeNext(typeof search.next === "string" ? search.next : null);
  return <SignUpForm next={next} />;
}
