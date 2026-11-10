import Link from "next/link";
import { Suspense } from "react";

import { CreateGroupForm } from "@/components/create-group-form";
import { listGroupsForUser } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-xl p-4">
      <Suspense fallback={<p>Loading…</p>}>
        <HomeBody />
      </Suspense>
    </main>
  );
}

async function HomeBody() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <p>
        <Link className="rounded-sm border px-3 py-2" href="/sign-in">
          Sign in
        </Link>{" "}
        <Link className="rounded-sm border px-3 py-2" href="/sign-up">
          Create an account
        </Link>
      </p>
    );
  }

  const groups = listGroupsForUser(user.id);
  return (
    <div>
      <h1>Your groups</h1>
      {groups.length === 0 ? <p>No groups yet.</p> : null}
      <ul>
        {groups.map((group) => (
          <li key={group.id}>
            <Link className="rounded-sm" href={`/groups/${group.id}`}>
              {group.name}
            </Link>
          </li>
        ))}
      </ul>
      <CreateGroupForm />
    </div>
  );
}
