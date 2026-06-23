import { NextResponse } from "next/server";
import { getWebhookReceiver } from "@/lib/livekit";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/livekit/webhook
 * Receives LiveKit Cloud webhooks. The request is authenticated by the
 * signature in the Authorization header (verified by WebhookReceiver) — NOT by
 * a user cookie, so this route is excluded from auth middleware.
 *
 * Configure the webhook URL in the LiveKit dashboard:
 *   Settings -> Webhooks -> https://YOUR_DOMAIN/api/livekit/webhook
 */
export async function POST(request: Request) {
  const body = await request.text();
  const authHeader = request.headers.get("authorization") ?? "";

  let event;
  try {
    const receiver = getWebhookReceiver();
    event = await receiver.receive(body, authHeader);
  } catch (err) {
    console.error("invalid webhook signature", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();

    if (event.event === "egress_ended" || event.event === "egress_updated") {
      const info = event.egressInfo;
      if (info) {
        // status: 0=STARTING 1=ACTIVE 2=ENDING 3=COMPLETE 4=FAILED 5=ABORTED 6=LIMIT_REACHED
        let status: "recording" | "completed" | "failed" | "aborted" =
          "recording";
        if (info.status === 3 || info.status === 6) status = "completed";
        else if (info.status === 4) status = "failed";
        else if (info.status === 5) status = "aborted";

        const fileResult = info.fileResults?.[0];
        const storageKey = fileResult?.filename ?? null;
        const durationNs = fileResult?.duration ?? 0n;
        const durationSecs = Number(BigInt(durationNs) / 1_000_000_000n);

        await admin
          .from("recordings")
          .update({
            status,
            storage_key: storageKey,
            duration_secs: durationSecs || null,
          })
          .eq("egress_id", info.egressId);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("webhook processing error", err);
    // Return 200 so LiveKit doesn't retry forever on a non-signature error.
    return NextResponse.json({ ok: false });
  }
}
