import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import VideoRoom from "./VideoRoom";

export default async function RoomPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();
  const profile = await getProfile();

  const { data: room } = await supabase
    .from("rooms")
    .select("id, name, slug")
    .eq("slug", params.slug)
    .single();

  if (!room) notFound();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{room.name}</h1>
          <p className="text-sm text-slate-400">/{room.slug}</p>
        </div>
        <Link href="/rooms" className="btn-secondary">
          Leave
        </Link>
      </div>

      <VideoRoom
        roomName={room.slug}
        canRecord={true}
        displayName={profile?.full_name || profile?.email || "Guest"}
      />
    </div>
  );
}
