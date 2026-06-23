import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import AdminUsers from "./AdminUsers";

export default async function AdminPage() {
  const profile = await getProfile();
  // Defence in depth: the layout already requires auth; here we require admin.
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="mt-1 text-sm text-slate-500">Manage users and their roles.</p>
      <div className="mt-6">
        <AdminUsers currentUserId={profile.id} />
      </div>
    </div>
  );
}
