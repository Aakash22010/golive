import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

interface Recording {
  id: string;
  room_name: string;
  status: string;
  duration_secs: number | null;
  created_at: string;
}

function fmtDuration(secs: number | null) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

export default async function RecordingsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("recordings")
    .select("id, room_name, status, duration_secs, created_at")
    .order("created_at", { ascending: false });

  const recordings = (data as Recording[]) ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Recordings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Recorded calls. A finished recording can take a minute to process after you stop it.
      </p>

      <div className="mt-6 space-y-3">
        {recordings.length === 0 && (
          <p className="text-sm text-slate-500">No recordings yet.</p>
        )}
        {recordings.map((r) => (
          <div key={r.id} className="card flex items-center justify-between">
            <div>
              <p className="font-medium">{r.room_name}</p>
              <p className="text-xs text-slate-400">
                {new Date(r.created_at).toLocaleString()} · {fmtDuration(r.duration_secs)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={r.status} />
              {r.status === "completed" && (
                <Link href={`/recordings/${r.id}`} className="btn-primary">
                  Watch
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    recording: "bg-red-100 text-red-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-slate-200 text-slate-600",
    aborted: "bg-slate-200 text-slate-600",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${map[status] ?? ""}`}>
      {status}
    </span>
  );
}
