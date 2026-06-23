"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Room {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  created_at: string;
}

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "room"}-${suffix}`;
}

export default function RoomsPage() {
  const supabase = createClient();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [name, setName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    setRooms((data as Room[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function createRoom() {
    setError(null);
    if (!name.trim() || !userId) return;
    const { error } = await supabase.from("rooms").insert({
      name: name.trim(),
      slug: slugify(name),
      created_by: userId,
    });
    if (error) {
      setError(error.message);
      return;
    }
    setName("");
    load();
  }

  async function deleteRoom(id: string) {
    if (!confirm("Delete this room? Past recordings are kept.")) return;
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) setError(error.message);
    else load();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Video rooms</h1>

      <div className="card mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="label" htmlFor="roomName">New room name</label>
          <input
            id="roomName"
            className="input"
            placeholder="e.g. Weekly sync"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createRoom()}
          />
        </div>
        <button onClick={createRoom} disabled={!name.trim()} className="btn-primary">
          Create room
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-3">
        {loading && <p className="text-sm text-slate-500">Loading…</p>}
        {!loading && rooms.length === 0 && (
          <p className="text-sm text-slate-500">No rooms yet. Create one above.</p>
        )}
        {rooms.map((r) => (
          <div key={r.id} className="card flex items-center justify-between">
            <div>
              <p className="font-medium">{r.name}</p>
              <p className="text-xs text-slate-400">/{r.slug}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/room/${r.slug}`} className="btn-primary">
                Join
              </Link>
              {r.created_by === userId && (
                <button onClick={() => deleteRoom(r.id)} className="btn-secondary">
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
