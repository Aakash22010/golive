import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import Nav from "./Nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <div>
      <Nav name={profile.full_name || profile.email || "User"} role={profile.role} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
