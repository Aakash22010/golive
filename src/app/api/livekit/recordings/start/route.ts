import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { startRoomRecording } from "@/lib/livekit";
import { createAdminClient } from "@/lib/supabase/admin";
import { startRecordingSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/livekit/recordings/start
 * Body: { room: string }
 * Starts a server-side composite recording and stores a 'recording' row.
 * The recordings row is written with the service-role client because users
 * have no direct INSERT permission on the recordings table.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = startRecordingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const room = parsed.data.room;

  try {
    const info = await startRoomRecording(room);

    const admin = createAdminClient();
    await admin.from("recordings").insert({
      room_name: room,
      room_slug: room,
      started_by: auth.profile.id,
      egress_id: info.egressId,
      status: "recording",
    });

    return NextResponse.json({ egressId: info.egressId });
  } catch (err) {
    console.error("start recording error", err);
    return NextResponse.json(
      { error: "Could not start recording" },
      { status: 500 }
    );
  }
}
