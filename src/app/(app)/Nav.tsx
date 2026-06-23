"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/rooms", label: "Rooms" },
  { href: "/notes", label: "Notes" },
  { href: "/recordings", label: "Recordings" },
];

export default function Nav({
  name,
  role,
}: {
  name: string;
  role: "user" | "admin";
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const allLinks =
    role === "admin" ? [...links, { href: "/admin", label: "Admin" }] : links;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-bold text-brand">
            MeetNotes
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {allLinks.map((l) => {
              const active =
                pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    active
                      ? "bg-brand/10 text-brand"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-500 sm:inline">
            {name}
            {role === "admin" && (
              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                admin
              </span>
            )}
          </span>
          <button onClick={signOut} className="btn-secondary text-sm">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
