"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Note {
  id: string;
  title: string;
  content: string;
  updated_at: string;
}

export default function NotesPage() {
  const supabase = createClient();
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("notes")
      .select("id, title, content, updated_at")
      .order("updated_at", { ascending: false });
    if (error) setError(error.message);
    setNotes((data as Note[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  function selectNote(n: Note) {
    setActiveId(n.id);
    setTitle(n.title);
    setContent(n.content);
  }

  function newNote() {
    setActiveId(null);
    setTitle("");
    setContent("");
  }

  async function save() {
    setError(null);
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    if (activeId) {
      const { error } = await supabase
        .from("notes")
        .update({ title: title || "Untitled", content, updated_at: new Date().toISOString() })
        .eq("id", activeId);
      if (error) setError(error.message);
    } else {
      const { data, error } = await supabase
        .from("notes")
        .insert({ user_id: user.id, title: title || "Untitled", content })
        .select("id")
        .single();
      if (error) setError(error.message);
      else if (data) setActiveId(data.id);
    }
    setSaving(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this note?")) return;
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) setError(error.message);
    else {
      if (activeId === id) newNote();
      load();
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">My notes</h1>
      <p className="mt-1 text-sm text-slate-500">Private to you — no one else can read these.</p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid gap-4 md:grid-cols-[260px_1fr]">
        <aside className="space-y-2">
          <button onClick={newNote} className="btn-primary w-full">
            + New note
          </button>
          {loading && <p className="text-sm text-slate-500">Loading…</p>}
          {notes.map((n) => (
            <div
              key={n.id}
              className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                activeId === n.id
                  ? "border-brand bg-brand/5"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
              onClick={() => selectNote(n)}
            >
              <span className="truncate">{n.title || "Untitled"}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  remove(n.id);
                }}
                className="ml-2 text-slate-400 hover:text-red-600"
                aria-label="Delete note"
              >
                ✕
              </button>
            </div>
          ))}
        </aside>

        <section className="card">
          <input
            className="input mb-3 text-lg font-medium"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="input min-h-[320px] resize-y"
            placeholder="Write your note…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="mt-3 flex justify-end">
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? "Saving…" : activeId ? "Save changes" : "Create note"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
