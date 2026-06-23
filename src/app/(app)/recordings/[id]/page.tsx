import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function RecordingPlayerPage({
  params,
}: {
  params: { id: string };
}) {
  // RLS-protected read: confirms the user may see this recording's metadata.
  const supabase = createClient();
  const { data: rec } = await supabase
    .from("recordings")
    .select("id, room_name, storage_key, status, created_at")
    .eq("id", params.id)
    .single();

  if (!rec) notFound();

  // Generate a short-lived signed URL for the private object (service role).
  let signedUrl: string | null = null;
  if (rec.status === "completed" && rec.storage_key) {
    const admin = createAdminClient();
    const { data } = await admin.storage
      .from(process.env.S3_BUCKET!)
      .createSignedUrl(rec.storage_key, 60 * 60); // 1 hour
    signedUrl = data?.signedUrl ?? null;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{rec.room_name}</h1>
          <p className="text-sm text-slate-400">
            {new Date(rec.created_at).toLocaleString()}
          </p>
        </div>
        <Link href="/recordings" className="btn-secondary">
          Back
        </Link>
      </div>

      {signedUrl ? (
        <video
          controls
          src={signedUrl}
          className="w-full rounded-xl border border-slate-200 bg-black"
        />
      ) : (
        <div className="card text-sm text-slate-500">
          This recording isn’t available to play yet (still processing, or the file
          wasn’t found in storage).
        </div>
      )}
    </div>
  );
}
