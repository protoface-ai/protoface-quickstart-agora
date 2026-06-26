"use client";

import { ProtofaceClient } from "protoface-client";
import { useRef, useState } from "react";
import type { IAgoraRTCClient, IAgoraRTCRemoteUser, ILocalAudioTrack } from "agora-rtc-sdk-ng";
import type { StopListening } from "protoface-client";

const avatar = {
  protoface_avatarid: process.env.NEXT_PUBLIC_PROTOFACE_AVATAR_ID || "av_stock_001"
};

type SessionState = "idle" | "starting" | "connected" | "disconnecting" | "disconnected" | "error";

interface AgoraConnectionResponse {
  token: string;
  uid: string;
  channel: string;
  agentUid: string;
  agentId: string;
}

interface ProtofaceConnectionResponse {
  sessionToken: string;
  livekitUrl: string;
  roomName: string;
  participantToken: string;
  sessionId?: string;
  avatarId?: string;
  avatarIdentity?: string;
  expiresAt?: string;
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const protofaceRef = useRef<ProtofaceClient | null>(null);
  const agoraClientRef = useRef<IAgoraRTCClient | null>(null);
  const microphoneTrackRef = useRef<ILocalAudioTrack | null>(null);
  const audioCleanupRef = useRef<StopListening | null>(null);
  const cleanupPromiseRef = useRef<Promise<void> | null>(null);
  const agentIdRef = useRef<string | null>(null);
  const agoraSessionRef = useRef<{ channel: string; agentUid: string } | null>(null);

  const [state, setState] = useState<SessionState>("idle");
  const [mode, setMode] = useState("idle");
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<string[]>([]);

  const isRunning = state === "starting" || state === "connected" || state === "disconnecting";
  const canDisconnect = state === "starting" || state === "connected";

  async function start() {
    if (isRunning) {
      return;
    }

    setState("starting");
    setMode("starting");
    setError(null);
    setEvents([]);

    try {
      const agora = await createAgoraConnection();
      agentIdRef.current = agora.agentId;
      agoraSessionRef.current = { channel: agora.channel, agentUid: agora.agentUid };

      const connection = await createProtofaceConnection({
        avatarId: avatar.protoface_avatarid,
        maxSessionLength: 600,
        maxIdleTime: 180,
        metadata: {
          provider: "agora",
          channel: agora.channel
        }
      });

      const protoface = new ProtofaceClient({
        avatarId: connection.avatarId ?? avatar.protoface_avatarid,
        livekitUrl: connection.livekitUrl,
        roomName: connection.roomName,
        participantToken: connection.participantToken,
        workerToken: "server-created",
        workerIdentity: connection.avatarIdentity,
        videoElement: videoRef.current,
        audioElement: audioRef.current,
        apiClient: createBrowserSessionApi(connection)
      });

      protoface.on("start", () => pushEvent("Protoface started."));
      protoface.on("error", ({ error: protofaceError }) => {
        setError(protofaceError.message);
        pushEvent(`Protoface error: ${protofaceError.message}`);
        void endSession("error");
      });
      protoface.on("speaking", () => {
        setMode("speaking");
        pushEvent("Protoface is speaking.");
      });
      protoface.on("silent", () => {
        setMode("listening");
        pushEvent("Protoface is ready.");
      });

      await protoface.start();
      protofaceRef.current = protoface;

      const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      agoraClientRef.current = client;

      client.on("connection-state-change", (currentState) => {
        pushEvent(`Agora connection ${formatStatusLabel(currentState)}.`);
        if (currentState === "CONNECTED") {
          setState("connected");
          setMode("listening");
        }
        if (currentState === "DISCONNECTED") {
          void endSession("disconnected");
        }
      });

      client.on("user-published", async (user, mediaType) => {
        if (mediaType !== "audio") {
          return;
        }
        await client.subscribe(user, "audio");
        await connectAgentAudio(user, protoface);
      });

      await client.join(process.env.NEXT_PUBLIC_AGORA_APP_ID!, agora.channel, agora.token, Number(agora.uid));
      const microphoneTrack = await AgoraRTC.createMicrophoneAudioTrack();
      microphoneTrackRef.current = microphoneTrack;
      await client.publish(microphoneTrack);
      pushEvent("Microphone connected to Agora.");

      await Promise.all(client.remoteUsers.map((user) => connectAgentAudio(user, protoface)));
    } catch (startError) {
      const message = normalizeError(startError);
      setError(message);
      pushEvent(`Start failed: ${message}`);
      await endSession("error");
      setState("error");
    }
  }

  async function stop() {
    await endSession("disconnected");
    pushEvent("Session stopped.");
  }

  async function connectAgentAudio(user: IAgoraRTCRemoteUser, protoface: ProtofaceClient) {
    if (String(user.uid) !== agoraSessionRef.current?.agentUid || audioCleanupRef.current) {
      return;
    }

    const audioTrack = user.audioTrack;
    const mediaTrack = audioTrack?.getMediaStreamTrack();
    if (!audioTrack || !mediaTrack) {
      return;
    }

    audioCleanupRef.current = await protoface.listenToMediaStreamTrack(mediaTrack);
    pushEvent("Agora agent audio connected to Protoface.");
  }

  async function endSession(nextState: "disconnected" | "error") {
    if (cleanupPromiseRef.current) {
      await cleanupPromiseRef.current;
      return;
    }

    setState("disconnecting");
    cleanupPromiseRef.current = cleanupSession();
    await cleanupPromiseRef.current;
    cleanupPromiseRef.current = null;
    setState(nextState);
  }

  async function cleanupSession() {
    setMode("idle");
    audioCleanupRef.current?.();
    audioCleanupRef.current = null;

    if (microphoneTrackRef.current) {
      microphoneTrackRef.current.stop();
      microphoneTrackRef.current.close();
      microphoneTrackRef.current = null;
    }

    await agoraClientRef.current?.leave().catch(() => {});
    agoraClientRef.current = null;

    if (agentIdRef.current && agoraSessionRef.current) {
      await fetch("/api/agora/conversational-ai", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          agentId: agentIdRef.current,
          channel: agoraSessionRef.current.channel,
          agentUid: agoraSessionRef.current.agentUid
        })
      }).catch(() => {});
      agentIdRef.current = null;
    }
    agoraSessionRef.current = null;

    await protofaceRef.current?.stop();
    protofaceRef.current = null;
  }

  function pushEvent(message: string) {
    setEvents((current) => [message, ...current].slice(0, 8));
  }

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="https://protoface.com" target="_blank" rel="noreferrer">
          <span>Protoface</span>
        </a>

        <nav className="navLinks" aria-label="Starter links">
          <a href="https://docs.protoface.com/guides/avatars" target="_blank" rel="noreferrer">
            Docs
          </a>
          <a href="https://docs.agora.io/en/conversational-ai/overview/product-overview" target="_blank" rel="noreferrer">
            Agora
          </a>
          <a href="https://app.protoface.com" target="_blank" rel="noreferrer">
            Login
          </a>
        </nav>
      </header>

      <div className="shell">
        <section className="stage" aria-label="Protoface avatar stage">
          {state !== "connected" ? (
            <div className="stagePreview">
              <p className="eyebrow">Protoface preview</p>
              <h2>Your avatar will appear here once the conversation starts.</h2>
              <p>Start a session to test Agora Conversational AI with a realtime Protoface avatar.</p>
            </div>
          ) : null}
          <video ref={videoRef} className="avatarVideo" autoPlay playsInline />
          <audio ref={audioRef} autoPlay />
        </section>

        <aside className="controls">
          <section className="intro">
            <h1>Realtime avatars for AI.</h1>
            <p>
              Add a realtime Protoface avatar to Agora Conversational AI. Start a session to try the full conversation flow.
            </p>
          </section>

          <section className="status">
            <div className="buttonRow">
              <button className="button" type="button" onClick={start} disabled={isRunning}>
                {state === "starting" ? "Starting" : "Start conversation"}
              </button>
              <button className="button secondary" type="button" onClick={stop} disabled={!canDisconnect}>
                End conversation
              </button>
            </div>

            <div className="statusList">
              <div className="statusItem">
                <strong>Session</strong>
                <span className="pill">{formatStatusLabel(state)}</span>
              </div>
              <div className="statusItem">
                <strong>Agora</strong>
                <span className="pill">
                  {agoraClientRef.current ? formatStatusLabel(agoraClientRef.current.connectionState) : "Not started"}
                </span>
              </div>
              <div className="statusItem">
                <strong>Mode</strong>
                <span className="pill">{formatStatusLabel(mode)}</span>
              </div>
              <div className="statusItem">
                <strong>Protoface avatar</strong>
                <span className="pill">{avatar.protoface_avatarid}</span>
              </div>
              <div className="statusItem">
                <strong>Agora agent</strong>
                <span className="pill">{shortId(agentIdRef.current)}</span>
              </div>
            </div>

            {error ? <p className="error">{error}</p> : null}
          </section>

          <section className="log">
            <h2>Events</h2>
            <ul className="logList" aria-live="polite">
              {events.length > 0 ? (
                events.map((event, index) => <li key={`${event}-${index}`}>{event}</li>)
              ) : (
                <li>Ready when you are.</li>
              )}
            </ul>
          </section>

          <section className="quickStart">
            <h2>Quick start</h2>
            <ol>
              <li>Add keys to `.env`.</li>
              <li>Create an Agora Conversational AI agent.</li>
              <li>Set the avatar ID you want to preview.</li>
            </ol>
          </section>
        </aside>
      </div>
    </main>
  );
}

async function createAgoraConnection() {
  const response = await fetch("/api/agora/conversational-ai", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({})
  });
  const payload = (await response.json()) as AgoraConnectionResponse & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to start Agora Conversational AI.");
  }
  return payload;
}

async function createProtofaceConnection(body: {
  avatarId: string;
  maxSessionLength: number;
  maxIdleTime: number;
  metadata: Record<string, string | number | boolean | null>;
}) {
  const response = await fetch("/api/protoface/session-token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = (await response.json()) as ProtofaceConnectionResponse & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to create Protoface session.");
  }
  return payload;
}

function createBrowserSessionApi(connection: ProtofaceConnectionResponse) {
  return {
    async createLiveKitSession() {
      return {
        id: connection.sessionId ?? connection.sessionToken,
        status: "running" as const,
        avatar_id: connection.avatarId ?? avatar.protoface_avatarid,
        transport: {
          type: "livekit" as const,
          url: connection.livekitUrl,
          room_name: connection.roomName,
          audio_source: "data_stream" as const,
          worker_identity: connection.avatarIdentity
        },
        quality: "standard",
        max_duration_seconds: 600,
        idle_timeout_seconds: 180,
        metadata: {},
        created_at: new Date().toISOString()
      };
    },
    async endSession(sessionId: string) {
      await fetch("/api/protoface/session-token", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
    }
  };
}

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function shortId(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }
  return value.length > 16 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

function formatStatusLabel(value: string | null | undefined) {
  if (!value) {
    return "Not started";
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
