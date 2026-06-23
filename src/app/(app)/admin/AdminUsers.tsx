"use client";

import { useEffect, useState, useCallback } from "react";

interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  role: "user" | "admin";
  created_at: string;
}

export default function AdminUsers({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/admin/users");
    if (!res.ok) {
      setError("Could not load users.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setRole(userId: string, role: "user" | "admin") {
    setBusyId(userId);
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not update role.");
    } else {
      await load();
    }
    setBusyId(null);
  }

  if (loading) return <p className="text-sm text-slate-500">Loading users…</p>;

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{u.full_name || "—"}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      u.role === "admin"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {u.id === currentUserId ? (
                    <span className="text-xs text-slate-400">you</span>
                  ) : u.role === "admin" ? (
                    <button
                      onClick={() => setRole(u.id, "user")}
                      disabled={busyId === u.id}
                      className="btn-secondary text-xs"
                    >
                      Make user
                    </button>
                  ) : (
                    <button
                      onClick={() => setRole(u.id, "admin")}
                      disabled={busyId === u.id}
                      className="btn-primary text-xs"
                    >
                      Make admin
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
