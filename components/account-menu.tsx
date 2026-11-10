import { signOut } from "@/app/actions";
import { SignedOutLinks } from "@/components/signed-out-links";
import { getCurrentUser } from "@/lib/session";

export async function AccountMenu() {
  const user = await getCurrentUser();
  if (!user) {
    return <SignedOutLinks />;
  }

  return (
    <form action={signOut}>
      <span>{user.name}</span>{" "}
      <button className="rounded-sm border px-2 py-1" type="submit">
        Sign out
      </button>
    </form>
  );
}
