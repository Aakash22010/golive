"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";

export default function VideoRoom({
  roomName,
  displayName,
  canRecord,
}: {
  roomName: string;
  displayName: string;
  canRecord: boolean;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [recording, setRecording] = useState(false);
  const [egressId, setEgressId] = useState<string | null>(null);
  const [recBusy, setRecBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: roomName }),
        });
        if (!res.ok) throw new Error("Could not get access token");
        const data = await res.json();
        if (!cancelled) {
          setToken(data.token);
          setServerUrl(data.url);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomName]);

  async function startRecording() {
    setRecBusy(true);
    try {
      const res = await fetch("/api/livekit/recordings/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start recording");
      setEgressId(data.egressId);
      setRecording(true);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setRecBusy(false);
    }
  }

  async function stopRecording() {
    if (!egressId) return;
    setRecBusy(true);
    try {
      const res = await fetch("/api/livekit/recordings/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ egressId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to stop recording");
      setRecording(false);
      setEgressId(null);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setRecBusy(false);
    }
  }

  if (error) {
    return (
      <div className="card text-sm text-red-600">
        {error}. Check your LiveKit configuration.
      </div>
    );
  }

  if (!token || !serverUrl) {
    return <div className="card text-sm text-slate-500">Connecting…</div>;
  }

  return (
    <div className="space-y-3">
      {canRecord && (
        <div className="flex items-center gap-3">
          {recording ? (
            <button onClick={stopRecording} disabled={recBusy} className="btn-danger">
              {recBusy ? "…" : "■ Stop recording"}
            </button>
          ) : (
            <button onClick={startRecording} disabled={recBusy} className="btn-secondary">
              {recBusy ? "…" : "● Record call"}
            </button>
          )}
          {recording && (
            <span className="flex items-center gap-1.5 text-sm text-red-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
              Recording
            </span>
          )}
        </div>
      )}

      <div
        className="overflow-hidden rounded-xl border border-slate-200"
        style={{ height: "70vh" }}
        data-lk-theme="default"
      >
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect={true}
          video={true}
          audio={true}
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </div>
  );
}
