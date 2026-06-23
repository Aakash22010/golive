import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { stopRecording } from "@/lib/livekit";
import { stopRecordingSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/livekit/recordings/stop
 * Body: { egressId: string }
 * Stops an active recording. The final file path / duration / status are
 * filled in asynchronously by the webhook when egress actually ends.
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

  const parsed = stopRecordingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    await stopRecording(parsed.data.egressId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("stop recording error", err);
    return NextResponse.json(
      { error: "Could not stop recording" },
      { status: 500 }
    );
  }
}
