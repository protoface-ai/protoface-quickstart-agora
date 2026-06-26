import { NextResponse } from "next/server";
import { RtcRole, RtcTokenBuilder } from "agora-token";

export const runtime = "nodejs";

export async function POST() {
  try {
    const appId = requireEnv("NEXT_PUBLIC_AGORA_APP_ID");
    const appCertificate = requireEnv("AGORA_APP_CERTIFICATE");
    const pipelineId = requireEnv("AGORA_CONVOAI_PIPELINE_ID");
    const channel = `protoface-agora-${crypto.randomUUID()}`;
    const name = `protoface-agora-${crypto.randomUUID()}`;
    const uid = randomAgoraUid();
    const agentUid = randomAgoraUid();
    const browserToken = createRtcToken({ appId, appCertificate, channel, uid });
    const agentToken = createRtcToken({ appId, appCertificate, channel, uid: agentUid });

    const response = await fetch(`${getAgoraApiBaseUrl()}/v2/projects/${appId}/join`, {
      method: "POST",
      headers: {
        Authorization: `agora token=${agentToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        name,
        pipeline_id: pipelineId,
        properties: {
          channel,
          agent_rtc_uid: agentUid,
          remote_rtc_uids: ["*"],
          token: agentToken
        }
      })
    });
    const payload = (await response.json().catch(() => null)) as
      | ({ agent_id?: string; agentId?: string; error?: unknown } & Record<string, unknown>)
      | null;

    if (!response.ok) {
      throw new Error(extractAgoraError(payload) ?? `Agora join failed with status ${response.status}.`);
    }

    const agentId = payload?.agent_id ?? payload?.agentId;
    if (!agentId) {
      throw new Error("Agora join response is missing agent ID.");
    }

    return NextResponse.json({ token: browserToken, uid, channel, agentUid, agentId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start Agora Conversational AI.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { agentId, channel, agentUid } = (await request.json()) as {
      agentId?: string;
      channel?: string;
      agentUid?: string;
    };
    if (!agentId) {
      throw new Error("Missing agentId.");
    }
    if (!channel) {
      throw new Error("Missing channel.");
    }
    if (!agentUid) {
      throw new Error("Missing agentUid.");
    }

    const appId = requireEnv("NEXT_PUBLIC_AGORA_APP_ID");
    const appCertificate = requireEnv("AGORA_APP_CERTIFICATE");
    const token = createRtcToken({ appId, appCertificate, channel, uid: agentUid });
    const response = await fetch(`${getAgoraApiBaseUrl()}/v2/projects/${appId}/agents/${agentId}/leave`, {
      method: "POST",
      headers: {
        Authorization: `agora token=${token}`,
        "content-type": "application/json"
      }
    });

    if (!response.ok && response.status !== 404) {
      const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
      throw new Error(extractAgoraError(payload) ?? `Agora stop failed with status ${response.status}.`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to stop Agora Conversational AI.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function getAgoraApiBaseUrl() {
  return "https://api.agora.io/api/conversational-ai-agent";
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

function randomAgoraUid() {
  return String(Math.floor(Math.random() * 9_999_000) + 1000);
}

function extractAgoraError(payload: { error?: unknown } | null) {
  if (!payload?.error) {
    return null;
  }
  if (typeof payload.error === "string") {
    return payload.error;
  }
  if (typeof payload.error === "object" && "message" in payload.error) {
    const message = (payload.error as { message?: unknown }).message;
    return typeof message === "string" ? message : null;
  }
  return null;
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}
