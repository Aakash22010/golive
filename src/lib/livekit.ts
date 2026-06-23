import {
  AccessToken,
  EgressClient,
  WebhookReceiver,
  EncodedFileOutput,
  EncodedFileType,
  S3Upload,
} from "livekit-server-sdk";

const apiKey = process.env.LIVEKIT_API_KEY!;
const apiSecret = process.env.LIVEKIT_API_SECRET!;
const host = process.env.LIVEKIT_HOST!; // https://...

function assertEnv() {
  if (!apiKey || !apiSecret) {
    throw new Error("LIVEKIT_API_KEY / LIVEKIT_API_SECRET not set");
  }
}

/**
 * Mint a short-lived join token for a participant.
 * `isAdmin` grants roomAdmin (can mute/remove others, manage the room).
 */
export async function createAccessToken(opts: {
  room: string;
  identity: string;
  name?: string;
  isAdmin?: boolean;
}): Promise<string> {
  assertEnv();
  const at = new AccessToken(apiKey, apiSecret, {
    identity: opts.identity,
    name: opts.name,
    ttl: "1h", // short-lived; the browser re-requests as needed
  });
  at.addGrant({
    roomJoin: true,
    room: opts.room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: opts.isAdmin === true,
  });
  return at.toJwt();
}

export function getEgressClient(): EgressClient {
  assertEnv();
  return new EgressClient(host, apiKey, apiSecret);
}

/**
 * Start a server-side composite recording of a room, written to S3-compatible
 * storage (Supabase Storage). Returns the egress info incl. egressId.
 *
 * NOTE: the Egress S3 output shape is the most version-sensitive part of the
 * LiveKit SDK. If your installed `livekit-server-sdk` differs, check the docs:
 * https://docs.livekit.io/home/egress/
 */
export async function startRoomRecording(room: string) {
  const egress = getEgressClient();

  const fileOutput = new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    // {room_name} and {time} are substituted by LiveKit. This becomes the
    // object key inside the S3 bucket (e.g. "calls/weekly-sync-2026....mp4").
    filepath: "calls/{room_name}-{time}.mp4",
    output: {
      case: "s3",
      value: new S3Upload({
        accessKey: process.env.S3_ACCESS_KEY!,
        secret: process.env.S3_SECRET_KEY!,
        bucket: process.env.S3_BUCKET!,
        region: process.env.S3_REGION!,
        endpoint: process.env.S3_ENDPOINT!,
        forcePathStyle: true, // required for Supabase / MinIO-style endpoints
      }),
    },
  });

  return egress.startRoomCompositeEgress(
    room,
    { file: fileOutput },
    { layout: "speaker" }
  );
}

export async function stopRecording(egressId: string) {
  const egress = getEgressClient();
  return egress.stopEgress(egressId);
}

/** Verifies and parses an incoming LiveKit webhook. Throws if invalid. */
export function getWebhookReceiver(): WebhookReceiver {
  assertEnv();
  return new WebhookReceiver(apiKey, apiSecret);
}
