"use client";

import { ProtofaceClient } from "protoface-client";
import { useRef, useState } from "react";
import type { IAgoraRTCClient, IAgoraRTCRemoteUser, ILocalAudioTrack } from "agora-rtc-sdk-ng";
import type { StopListening } from "protoface-client";

type Integration = "protoface-client" | "agora-agents";
type SessionState = "idle" | "starting" | "connected" | "disconnecting" | "disconnected" | "error";

interface AgoraConnectionResponse {
  token: string;
  appId: string;
  avatarId: string;
  uid: string;
  channel: string;
  name: string;
  agentUid: string;
  avatarUid?: string;
  integration: Integration;
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
  const agoraSessionRef = useRef<AgoraConnectionResponse | null>(null);

  const [state, setState] = useState<SessionState>("idle");
  const [mode, setMode] = useState("idle");
  const [integration, setIntegration] = useState<Integration>("protoface-client");
  const [avatarId, setAvatarId] = useState("av_stock_001");
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
      const agora = await createAgoraConnection(integration);
      agoraSessionRef.current = agora;
      setAvatarId(agora.avatarId);

      if (integration === "protoface-client") {
        await startProtofaceClient(agora);
      } else {
      pushEvent("Protoface configured through the Agora Agents SDK.");
      }

      const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      agoraClientRef.current = client;

      client.on("connection-state-change", (currentState) => {
        pushEvent(`Agora connection ${formatStatusLabel(currentState)}.`);
        if (currentState === "CONNECTED") {
          setState("connected");
          setMode(integration === "protoface-client" ? "listening" : "waiting for avatar");
        }
        if (currentState === "DISCONNECTED") {
          void endSession("disconnected");
        }
      });

      client.on("user-published", (user, mediaType) => {
        if (mediaType === "datachannel") {
          return;
        }
        void connectRemoteMedia(user, mediaType).catch((mediaError) => {
          const message = normalizeError(mediaError);
          setError(message);
          pushEvent(`Media subscription failed: ${message}`);
        });
      });

      await client.join(agora.appId, agora.channel, agora.token, Number(agora.uid));
      const microphoneTrack = await AgoraRTC.createMicrophoneAudioTrack();
      microphoneTrackRef.current = microphoneTrack;
      await client.publish(microphoneTrack);
      pushEvent("Microphone connected to Agora.");

      for (const user of client.remoteUsers) {
        if (user.hasAudio) {
          await connectRemoteMedia(user, "audio");
        }
        if (user.hasVideo) {
          await connectRemoteMedia(user, "video");
        }
      }

      const startedAgent = await startAgoraAgent(agora);
      agentIdRef.current = startedAgent.agentId;
      pushEvent("Agora AgentKit session started.");
    } catch (startError) {
      const message = normalizeError(startError);
      setError(message);
      pushEvent(`Start failed: ${message}`);
      await endSession("error");
      setState("error");
    }
  }

  async function startProtofaceClient(agora: AgoraConnectionResponse) {
    const connection = await createProtofaceConnection({
      avatarId: agora.avatarId,
      maxSessionLength: 600,
      maxIdleTime: 180,
      metadata: {
        provider: "agora",
        channel: agora.channel,
        integration: "protoface-client"
      }
    });

    const protoface = new ProtofaceClient({
      avatarId: connection.avatarId ?? agora.avatarId,
      livekitUrl: connection.livekitUrl,
      roomName: connection.roomName,
      participantToken: connection.participantToken,
      workerToken: "server-created",
      workerIdentity: connection.avatarIdentity,
      videoElement: videoRef.current,
      audioElement: audioRef.current,
      apiClient: createBrowserSessionApi(connection, agora.avatarId)
    });
    protofaceRef.current = protoface;

    protoface.on("start", () => pushEvent("Protoface Client started."));
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
  }

  async function connectRemoteMedia(user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") {
    const client = agoraClientRef.current;
    const session = agoraSessionRef.current;
    if (!client || !session) {
      return;
    }

    if (session.integration === "protoface-client") {
      if (mediaType !== "audio" || String(user.uid) !== session.agentUid || audioCleanupRef.current) {
        return;
      }
      await client.subscribe(user, "audio");
      const mediaTrack = user.audioTrack?.getMediaStreamTrack();
      if (!mediaTrack || !protofaceRef.current) {
        return;
      }
      audioCleanupRef.current = await protofaceRef.current.listenToMediaStreamTrack(mediaTrack);
      pushEvent("Agora agent audio connected to Protoface Client.");
      return;
    }

    if (String(user.uid) !== session.avatarUid) {
      return;
    }

    await client.subscribe(user, mediaType);
    if (mediaType === "video" && user.videoTrack && videoRef.current) {
      user.videoTrack.play(videoRef.current);
      setMode("avatar connected");
      pushEvent("Protoface video received from the Agora channel.");
    }
    if (mediaType === "audio" && user.audioTrack) {
      user.audioTrack.play();
      pushEvent("Protoface audio received from the Agora channel.");
    }
  }

  async function stop() {
    await endSession("disconnected");
    pushEvent("Session stopped.");
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

    if (agentIdRef.current) {
      await fetch("/api/agora/conversational-ai", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId: agentIdRef.current })
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
              <p>Choose an integration, then start an Agora conversation with a realtime Protoface avatar.</p>
            </div>
          ) : null}
          <video ref={videoRef} className="avatarVideo" autoPlay playsInline />
          <audio ref={audioRef} autoPlay />
        </section>

        <aside className="controls">
          <section className="intro">
            <h1>Realtime avatars for AI.</h1>
            <p>Try the same Agora agent with Protoface connected in the browser or through the Agora Agents SDK.</p>
          </section>

          <section className="status">
            <fieldset className="integrationPicker" disabled={isRunning}>
              <legend>Integration</legend>
              <label className={integration === "protoface-client" ? "integrationOption selected" : "integrationOption"}>
                <input
                  type="radio"
                  name="integration"
                  value="protoface-client"
                  checked={integration === "protoface-client"}
                  onChange={() => setIntegration("protoface-client")}
                />
                <span>
                  <strong>Protoface Client</strong>
                  <small>
                    LiveKit transports the avatar audio and video. Agora is used only for the speech-to-speech agent.
                  </small>
                </span>
              </label>
              <label className={integration === "agora-agents" ? "integrationOption selected" : "integrationOption"}>
                <input
                  type="radio"
                  name="integration"
                  value="agora-agents"
                  checked={integration === "agora-agents"}
                  onChange={() => setIntegration("agora-agents")}
                />
                <span>
                  <strong>Agora Agents SDK</strong>
                  <small>Agora Channels transport the conversation and the Protoface avatar audio and video.</small>
                </span>
              </label>
            </fieldset>

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
                <span className="pill">{avatarId}</span>
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
              <li>Add the shared Agora and Protoface keys to `.env`.</li>
              <li>Add LiveKit keys when using Protoface Client.</li>
              <li>Choose an integration and start the conversation.</li>
            </ol>
          </section>
        </aside>
      </div>
    </main>
  );
}

async function createAgoraConnection(integration: Integration) {
  const response = await fetch("/api/agora/conversational-ai", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ integration })
  });
  const payload = (await response.json()) as AgoraConnectionResponse & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to start Agora Conversational AI.");
  }
  return payload;
}

async function startAgoraAgent(agora: AgoraConnectionResponse) {
  const response = await fetch("/api/agora/conversational-ai", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      integration: agora.integration,
      name: agora.name,
      channel: agora.channel,
      uid: agora.uid,
      agentUid: agora.agentUid,
      avatarUid: agora.avatarUid
    })
  });
  const payload = (await response.json()) as { agentId: string; error?: string };
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

function createBrowserSessionApi(connection: ProtofaceConnectionResponse, avatarId: string) {
  return {
    async createLiveKitSession() {
      return {
        id: connection.sessionId ?? connection.sessionToken,
        status: "running" as const,
        avatar_id: connection.avatarId ?? avatarId,
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
