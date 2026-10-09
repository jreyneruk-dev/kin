import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getUser } from "@/lib/session";

export const metadata: Metadata = {
  title: { default: "Kin — the Macartney family tree", template: "%s — Kin" },
  description: "A private, collaborative family tree for the Macartney, Davies and Fahey lines.",
  robots: { index: false, follow: false },
};

const nav = [
  { href: "/", label: "Tree" },
  { href: "/people", label: "People" },
  // A separate research line, deliberately its own tab: see src/lib/clusters.ts.
  { href: "/lissanoure", label: "Lissanoure" },
  { href: "/research", label: "Research" },
  { href: "/activity", label: "Activity" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  const items = user?.role === "owner" ? [...nav, { href: "/imports", label: "Import" }] : nav;
  return (
    <html lang="en-GB">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-kin focus:px-3 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
          <div className="wrap flex h-14 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-4 w-4 rounded-full bg-kin ring-4 ring-kin/20"
              />
              <span className="text-base font-extrabold tracking-tight text-kin-dark">Kin</span>
            </Link>
            <nav aria-label="Primary" className="hidden gap-1 md:flex">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded px-3 py-2 text-sm font-medium text-stone-700 hover:bg-kin-light hover:text-kin-dark"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <details className="relative md:hidden">
              <summary className="cursor-pointer list-none rounded px-3 py-2 text-sm font-medium text-stone-700 hover:bg-kin-light">
                Menu
              </summary>
              <nav
                aria-label="Mobile"
                className="absolute right-0 mt-2 w-44 rounded-lg border border-stone-200 bg-white p-2 shadow-lg"
              >
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded px-3 py-2 text-sm text-stone-700 hover:bg-kin-light"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </details>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="mt-16 border-t border-stone-200 bg-parchment">
          <div className="wrap py-8 text-xs text-stone-500">
            A private family site — nothing here is public. Invite-only membership; please
            respect living relatives&apos; privacy when sharing outside the family.
          </div>
        </footer>
      </body>
    </html>
  );
}
