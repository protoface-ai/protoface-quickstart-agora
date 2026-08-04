import { Agent, AgoraClient, Area, GenericAvatar } from "agora-agents";
import { NextResponse } from "next/server";
import { RtcRole, RtcTokenBuilder } from "agora-token";

export const runtime = "nodejs";

const DEFAULT_PROTOFACE_AGORA_BASE_URL = "https://api.protoface.com/v1/agora/";
const AGORA_AGENT_UID = "1000";
const AGORA_AVATAR_UID = "1001";
const AGORA_VIEWER_UID = "1002";

type Integration = "protoface-client" | "agora-agents";

interface PrepareRequest {
  integration?: Integration;
}

interface StartRequest {
  integration?: Integration;
  name?: string;
  channel?: string;
  uid?: string;
  agentUid?: string;
  avatarUid?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as PrepareRequest;
    const integration = requireIntegration(body.integration);
    const appId = requireEnv("AGORA_APP_ID");
    const appCertificate = requireEnv("AGORA_APP_CERTIFICATE");
    const channel = `protoface-agora-${crypto.randomUUID()}`;
    const name = `protoface-agora-${crypto.randomUUID()}`;
    const uid = AGORA_VIEWER_UID;
    const agentUid = AGORA_AGENT_UID;
    const avatarUid = integration === "agora-agents" ? AGORA_AVATAR_UID : undefined;
    const avatarId = requireEnv("PROTOFACE_AVATAR_ID");
    const token = createRtcToken({ appId, appCertificate, channel, uid });

    // The browser joins and publishes before it calls PUT to start this one AgentKit session.
    return NextResponse.json({ token, appId, avatarId, uid, channel, name, agentUid, avatarUid, integration });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to prepare the Agora conversation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as StartRequest;
    const integration = requireIntegration(body.integration);
    const name = requireBodyValue("name", body.name);
    const channel = requireBodyValue("channel", body.channel);
    const uid = requireBodyValue("uid", body.uid);
    const agentUid = requireBodyValue("agentUid", body.agentUid);
    const appId = requireEnv("AGORA_APP_ID");
    const appCertificate = requireEnv("AGORA_APP_CERTIFICATE");
    const client = createAgoraClient(appId, appCertificate);

    // AI Studio supplies this quickstart's STT, LLM, and TTS configuration.
    let agent = new Agent({ client, pipelineId: requireEnv("AGORA_CONVOAI_PIPELINE_ID") });

    // To configure vendors in code instead, import the vendors you use and replace
    // the line above with this builder shape:
    // let agent = new Agent({ client })
    //   .withStt(/* your STT vendor */)
    //   .withLlm(/* your LLM vendor */)
    //   .withTts(/* your TTS vendor */);

    if (integration === "agora-agents") {
      agent = agent.withAvatar(
        new GenericAvatar({
          apiKey: requireEnv("PROTOFACE_API_KEY"),
          apiBaseUrl: getProtofaceAgoraBaseUrl(),
          avatarId: requireEnv("PROTOFACE_AVATAR_ID"),
          agoraUid: requireBodyValue("avatarUid", body.avatarUid)
        })
      );
    }

    const session = agent.createSession({
      name,
      channel,
      agentUid,
      remoteUids: [uid],
      idleTimeout: 180
    });
    const agentId = await session.start();

    if (!agentId) {
      throw new Error("Agora Agents SDK did not return an agent ID.");
    }

    return NextResponse.json({ agentId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start Agora Conversational AI.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { agentId } = (await request.json()) as { agentId?: string };
    if (!agentId) {
      throw new Error("Missing agentId.");
    }

    const client = createAgoraClient(
      requireEnv("AGORA_APP_ID"),
      requireEnv("AGORA_APP_CERTIFICATE")
    );
    await client.stopAgent(agentId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to stop Agora Conversational AI.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function createAgoraClient(appId: string, appCertificate: string) {
  return new AgoraClient({
    area: Area.US,
    appId,
    appCertificate
  });
}

function getProtofaceAgoraBaseUrl() {
  const configured = process.env.PROTOFACE_AGORA_BASE_URL?.trim();
  return configured ? configured.replace(/\/+$/, "") : DEFAULT_PROTOFACE_AGORA_BASE_URL;
}

function createRtcToken(options: {
  appId: string;
  appCertificate: string;
  channel: string;
  uid: string;
}) {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  return RtcTokenBuilder.buildTokenWithUid(
    options.appId,
    options.appCertificate,
    options.channel,
    Number(options.uid),
    RtcRole.PUBLISHER,
    expiresAt,
    expiresAt
  );
}

function requireIntegration(value: Integration | undefined): Integration {
  if (value === "protoface-client" || value === "agora-agents") {
    return value;
  }
  throw new Error("integration must be protoface-client or agora-agents.");
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

function requireBodyValue(name: string, value: string | undefined) {
  if (!value?.trim()) {
    throw new Error(`Missing ${name}.`);
  }
  return value.trim();
}
