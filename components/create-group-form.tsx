"use client";

import { useActionState } from "react";

import { createGroupAction } from "@/app/actions";

export function CreateGroupForm() {
  const [state, action, pending] = useActionState(createGroupAction, null);
  return (
    <form action={action} className="surface rounded-sm border p-4">
      <label htmlFor="group-name">Group name</label>
      <input
        id="group-name"
        name="name"
        className="rounded-sm border my-2 block w-full px-2 py-1"
      />
      <button className="rounded-sm border px-3 py-2" type="submit" disabled={pending}>
        Create a group.
      </button>
      {state?.error ? <p>{state.error}</p> : null}
    </form>
  );
}
