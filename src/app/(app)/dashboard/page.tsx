import Link from "next/link";
import { getProfile } from "@/lib/auth";

export default async function DashboardPage() {
  const profile = await getProfile();

  const cards = [
    {
      href: "/rooms",
      title: "Video rooms",
      body: "Create a room and start a call. Recordings are saved automatically when you record.",
    },
    {
      href: "/notes",
      title: "My notes",
      body: "Private notes, visible only to you.",
    },
    {
      href: "/recordings",
      title: "Recordings",
      body: "Watch past calls that were recorded.",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold">
        Hi {profile?.full_name || "there"} 👋
      </h1>
      <p className="mt-1 text-slate-500">What would you like to do?</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="card transition hover:shadow-md">
            <h2 className="font-semibold">{c.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{c.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
