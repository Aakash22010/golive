import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createAccessToken } from "@/lib/livekit";
import { tokenRequestSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/livekit/token
 * Body: { room: string }
 * Returns a short-lived LiveKit join token scoped to that room for the
 * authenticated user. The API secret never leaves the server.
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

  const parsed = tokenRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { profile } = auth;

  try {
    const token = await createAccessToken({
      room: parsed.data.room,
      identity: profile.id,
      name: profile.full_name || profile.email || "Guest",
      isAdmin: profile.role === "admin",
    });

    return NextResponse.json({
      token,
      url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    });
  } catch (err) {
    console.error("token error", err);
    return NextResponse.json(
      { error: "Could not create token" },
      { status: 500 }
    );
  }
}
