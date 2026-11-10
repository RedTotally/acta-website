import type { ReactNode } from "react";
import Link from "next/link";
import { Suspense } from "react";

import { AccountMenu } from "@/components/account-menu";

import "./globals.css";

export const metadata = {
  title: "Acta",
  description:
    "A group board for people who already know each other. One person creates a group, shares a join link, and members log what they actually did.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b p-4">
          <Link className="rounded-sm" href="/">
            Acta
          </Link>
          <p>
            A group board for people who already know each other. One person
            creates a group, shares a join link, and members log what they
            actually did. The board moves when standing changes.
          </p>
          <Suspense fallback={null}>
            <AccountMenu />
          </Suspense>
        </header>
        {children}
      </body>
    </html>
  );
}
