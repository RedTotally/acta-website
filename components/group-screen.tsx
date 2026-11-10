"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { logWork } from "@/app/actions";
import { joinUrl } from "@/lib/paths";
import type { Member } from "@/lib/types";

const SCORE_ERROR = "The score could not be worked out.";

function subscribeOrigin(): () => void {
  return () => {};
}

function originSnapshot(): string {
  return window.location.origin;
}

function originServerSnapshot(): string {
  return "";
}

export function GroupScreen(props: {
  groupId: string;
  groupName: string;
  joinToken: string;
  members: Member[];
}) {
  const router = useRouter();
  const [members, setMembers] = useState(props.members);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(
    subscribeOrigin,
    originSnapshot,
    originServerSnapshot,
  );
  const href = origin ? joinUrl(origin, props.joinToken) : "";

  async function copyLink() {
    const link = joinUrl(window.location.origin, props.joinToken);
    const field = document.getElementById("join-link");
    if (field instanceof HTMLInputElement) {
      field.focus();
      field.select();
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      return;
    } catch {
      // The field is selected, so a plain copy still works.
    }
    setCopied(document.execCommand("copy"));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (text.trim() === "") {
      setText("");
      return;
    }
    setPending(true);
    try {
      const result = await logWork(props.groupId, text);
      if (result.status === "signed-out") {
        router.push(`/sign-in?next=${encodeURIComponent(`/groups/${props.groupId}`)}`);
        return;
      }
      if (result.status === "error") {
        setError(SCORE_ERROR);
        return;
      }
      if (result.status === "forbidden") {
        setError("You are not in this group.");
        return;
      }
      if (result.status === "too-long") {
        setError("Keep it to a few sentences.");
        return;
      }
      setText("");
      if (result.status === "updated") {
        setMembers(result.members);
      }
    } catch {
      setError(SCORE_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-4">
      <h1>{props.groupName}</h1>
      <div className="surface rounded-sm border my-4 p-4">
        <p>Share this link to join.</p>
        <input
          id="join-link"
          className="rounded-sm border my-2 block w-full px-2 py-1"
          readOnly
          value={href}
          aria-label="Join link"
          onFocus={(event) => event.currentTarget.select()}
        />
        <button className="rounded-sm border px-3 py-2" type="button" onClick={copyLink}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="surface rounded-sm border my-4 p-4">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left">Name</th>
              <th className="text-left">Standing</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.userId}>
                <td className="py-2 align-top">
                  {member.name}
                  {member.owner ? " Owner" : ""}
                </td>
                <td className="py-2 align-top">
                  {member.standing === null ? "" : member.standing}
                  {member.standing !== null && member.standingLog ? (
                    <div>{member.standingLog}</div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="surface rounded-sm border p-4" onSubmit={onSubmit}>
        <label htmlFor="log">What did you do?</label>
        <textarea
          id="log"
          rows={3}
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="rounded-sm border my-2 block w-full px-2 py-1"
        />
        <button className="rounded-sm border px-3 py-2" type="submit" disabled={pending}>
          {pending ? "Scoring" : "Log"}
        </button>
        {error ? <p role="alert">{error}</p> : null}
      </form>
    </main>
  );
}
