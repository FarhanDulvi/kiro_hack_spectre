"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/architecture", label: "Architecture" },
];

export function Navbar() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="sticky top-4 z-50 flex justify-center px-4">
      <div className="flex items-center gap-1 rounded-full border border-line bg-white/90 p-1.5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur">
        <Link href="/" className="px-3 text-[15px] font-bold tracking-tight">
          Perisai
        </Link>
        {LINKS.map((l) => {
          const active = l.href === path;
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-[13.5px] font-medium ${active ? "bg-deep text-ink" : "text-mist-dim hover:text-ink"}`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
