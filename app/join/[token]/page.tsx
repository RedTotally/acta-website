import { redirect } from "next/navigation";
import { Suspense } from "react";

import { addMember, groupByToken } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export default function JoinPage(props: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<p className="p-4">Checking the join link…</p>}>
      <Join params={props.params} />
    </Suspense>
  );
}

async function Join({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const group = groupByToken(token);
  if (!group) {
    return <p className="p-4">That join link does not match a group.</p>;
  }
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/join/${token}`)}`);
  }
  addMember(group.id, user.id);
  redirect(`/groups/${group.id}`);
}
