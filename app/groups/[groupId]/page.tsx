import { redirect } from "next/navigation";
import { Suspense } from "react";

import { GroupScreen } from "@/components/group-screen";
import { groupForMember } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export default function GroupPage(props: {
  params: Promise<{ groupId: string }>;
}) {
  return (
    <Suspense fallback={<p className="p-4">Loading the board…</p>}>
      <Board params={props.params} />
    </Suspense>
  );
}

async function Board({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/groups/${groupId}`)}`);
  }
  const board = groupForMember(groupId, user.id);
  if (!board) {
    return <p className="p-4">You are not in this group.</p>;
  }
  return (
    <GroupScreen
      key={board.id}
      groupId={board.id}
      groupName={board.name}
      joinToken={board.joinToken}
      members={board.members}
    />
  );
}
