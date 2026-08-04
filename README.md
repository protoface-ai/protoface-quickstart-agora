# Protoface Quickstart for Agora Conversational AI

This quickstart shows two ways to add a realtime Protoface avatar to the same Agora Conversational AI Studio pipeline. Choose the integration in the UI before starting a conversation:

- **Protoface Client** starts a Protoface LiveKit session in the browser and sends the Agora agent's audio to `protoface-client`.
- **Agora Agents SDK** configures Protoface as a `GenericAvatar`; Protoface publishes its audio and video directly into the Agora RTC channel.

## About Protoface

Protoface adds a real-time avatar to your AI app or agent.

Get a **free** API key at [protoface.com](https://protoface.com/?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-agora).

Read the docs at [docs.protoface.com](https://docs.protoface.com/?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-agora).

## Get started

1. Copy `.env.example` to `.env` and add the credentials for the integration you want to run.

```dotenv
# Required by both integrations
PROTOFACE_API_KEY="PROTOFACE-API-KEY"
PROTOFACE_AVATAR_ID="av_stock_001"

AGORA_APP_ID="AGORA-APP-ID"
AGORA_APP_CERTIFICATE="AGORA-APP-CERTIFICATE"
AGORA_CONVOAI_PIPELINE_ID="AGORA-AI-STUDIO-PIPELINE-ID"

# Required only by the protoface-client integration
LIVEKIT_URL="wss://YOUR-LIVEKIT-PROJECT.livekit.cloud"
LIVEKIT_API_KEY="LIVEKIT-API-KEY"
LIVEKIT_API_SECRET="LIVEKIT-API-SECRET"
```

The demo uses fixed, distinct RTC UIDs (`1000` for the agent, `1001` for the avatar, and `1002` for the viewer) and Agora's US API area.

2. Install packages.

```bash
npm install
```

3. Start the app and open [http://localhost:3000](http://localhost:3000).

```bash
npm run dev
```

4. Choose **Protoface Client** or **Agora Agents SDK**, then start the conversation.

## How the integrations work

### Protoface Client

1. The server prepares one Agora channel and one set of viewer/agent UIDs.
2. The server creates a separate Protoface LiveKit session.
3. The browser joins Agora and publishes microphone audio.
4. The server starts one AgentKit session from the configured Agora AI Studio pipeline, subscribed to that viewer UID.
5. The browser sends the Agora agent's speech track to `ProtofaceClient.listenToMediaStreamTrack()`.
6. `protoface-client` renders the avatar's LiveKit audio and video.

This path requires the `LIVEKIT_*` variables.

### Agora Agents SDK

1. The server prepares one Agora channel and one set of viewer/agent/avatar UIDs.
2. The browser joins Agora and publishes microphone audio first.
3. The server creates one Agora `Agent` from the configured AI Studio pipeline and adds one `GenericAvatar`.
4. AgentKit starts the session, subscribes to the viewer UID, and supplies the app ID, channel, and avatar token.
5. The app plays Protoface's audio/video tracks from the channel when the agent responds to the user.

This path does not require the `LIVEKIT_*` variables.

### Configure STT, LLM, and TTS in code instead

This quickstart currently uses `AGORA_CONVOAI_PIPELINE_ID`, so the published AI Studio pipeline supplies STT, LLM, and TTS. To configure those vendors directly in AgentKit instead, replace the pipeline-based constructor in `app/api/agora/conversational-ai/route.ts`:

```ts
let agent = new Agent({
  client,
  pipelineId: requireEnv("AGORA_CONVOAI_PIPELINE_ID")
});
```

with the vendors required by your application:

```ts
let agent = new Agent({ client })
  .withStt(/* your STT vendor */)
  .withLlm(/* your LLM vendor */)
  .withTts(/* your TTS vendor */);
```

Import and configure the appropriate Agora AgentKit vendor classes and credentials for those placeholders. Keep the existing `.withAvatar(new GenericAvatar(...))` call after this block. Do not configure both a pipeline ID and duplicate vendor settings unless you intentionally want the explicit settings to override the published pipeline.

## Avatars

Find avatars or create your own in the [Protoface dashboard](https://app.protoface.com?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-agora). Change `PROTOFACE_AVATAR_ID` to use another avatar.

See the [Protoface avatar docs](https://docs.protoface.com/guides/avatars?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-agora) for avatar management details.
