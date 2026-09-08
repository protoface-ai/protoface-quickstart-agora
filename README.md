# Protoface Quickstart for Agora Conversational AI

This quickstart shows two ways to add a real-time Protoface avatar to an Agora voice agent:

- **Protoface Client:** LiveKit carries the avatar audio and video. Agora still powers the voice conversation, but the avatar runs alongside it through `protoface-client`. Choose this option if you already use LiveKit or want to control the avatar directly from your frontend.

- **Agora Agents SDK:** Protoface joins the same Agora channel as the voice agent. Agora carries the conversation and the avatar audio and video, so you do not need LiveKit. Choose this option if you want the avatar managed as part of your Agora agent.

## About Protoface

Protoface Realtime provides high-quality, low-cost real-time AI avatars for AI agents, assistants, and applications. Protoface provides the cheapest AI video generation API for leading models, with ultra-low-cost hosted inference for text-to-video and image-to-video generation.

Get a **free** API key at [protoface.com](https://protoface.com/?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-agora).

Read the docs at [docs.protoface.com](https://docs.protoface.com/?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-agora).

## Get Started

1. Copy `.env.example` to `.env` and add your credentials.

```dotenv
# Required for both options
PROTOFACE_API_KEY="PROTOFACE-API-KEY"
PROTOFACE_AVATAR_ID="av_stock_001"

AGORA_APP_ID="AGORA-APP-ID"
AGORA_APP_CERTIFICATE="AGORA-APP-CERTIFICATE"
AGORA_CONVOAI_PIPELINE_ID="AGORA-AI-STUDIO-PIPELINE-ID"

# Required only for Protoface Client
LIVEKIT_URL="wss://YOUR-LIVEKIT-PROJECT.livekit.cloud"
LIVEKIT_API_KEY="LIVEKIT-API-KEY"
LIVEKIT_API_SECRET="LIVEKIT-API-SECRET"
```

2. Install the packages.

```bash
npm install
```

3. Start the app and open [http://localhost:3000](http://localhost:3000).

```bash
npm run dev
```

4. Choose **Protoface Client** or **Agora Agents SDK**, then start a conversation.

## How It Works

### Protoface Client

The Agora conversation and Protoface avatar run side by side:

1. The server prepares an Agora conversation.
2. The server starts a separate Protoface avatar session on LiveKit.
3. The browser joins Agora and publishes microphone audio.
4. The server starts the voice agent using your Agora AI Studio pipeline.
5. The browser sends the agent's speech to `protoface-client`, which displays the talking avatar from LiveKit.

This option requires the three `LIVEKIT_*` variables shown above.

### Agora Agents SDK

The voice agent and Protoface avatar share one Agora channel:

1. The server prepares an Agora channel for the viewer, voice agent, and avatar.
2. The browser joins the channel and publishes microphone audio.
3. The server creates the voice agent from your Agora AI Studio pipeline and adds Protoface as its avatar.
4. The server starts the agent and connects the Protoface avatar to the channel.
5. The browser plays the avatar audio and video from Agora when the agent responds.

This option does not use LiveKit.

## Configure AI Services in Code

By default, `AGORA_CONVOAI_PIPELINE_ID` loads the speech recognition, language model, and voice configured in Agora AI Studio.

If you prefer to configure those services in code, replace this:

```ts
let agent = new Agent({
  client,
  pipelineId: requireEnv("AGORA_CONVOAI_PIPELINE_ID")
})
```

with your chosen providers:

```ts
let agent = new Agent({ client })
  .withStt(/* your speech recognition provider */)
  .withLlm(/* your language model provider */)
  .withTts(/* your voice provider */)
```

Keep the existing `.withAvatar(new GenericAvatar(...))` call after this block.

## Avatars

Find avatars or create your own in the [Protoface dashboard](https://app.protoface.com?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-agora). Change `PROTOFACE_AVATAR_ID` to use another avatar.

See the [Protoface avatar docs](https://docs.protoface.com/guides/avatars?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-agora) for more details.

## Protoface: More Quickstarts

Protoface integrates with popular voice AI platforms.

Clone a starter repo, add your keys to the environment file, and run.

If an SDK or plugin is available separately, we've linked to it instead.

| Platform | Link |
| --- | --- |
| LiveKit | [Plugin](https://github.com/livekit/agents/tree/main/livekit-plugins/livekit-plugins-protoface) [Official Docs](https://docs.livekit.io/agents/models/avatar/plugins/protoface/)|
| Pipecat | [Plugin](https://github.com/protoface-ai/protoface-plugin-pipecat) [Official Docs](https://docs.pipecat.ai/api-reference/server/services/video/protoface)|
| Protoface Managed Conversations | [Starter Repo](https://github.com/protoface-ai/protoface-quickstart-conversations) |
| Agora | [Starter Repo](https://github.com/protoface-ai/protoface-quickstart-agora) |
| Vapi | [Starter Repo](https://github.com/protoface-ai/protoface-quickstart-vapi) |
| ElevenLabs Agents | [Starter Repo](https://github.com/protoface-ai/protoface-quickstart-elevenlabs-agents) |
| OpenAI Realtime | [Starter Repo](https://github.com/protoface-ai/protoface-quickstart-openai-realtime) |
| VideoSDK | [Starter Repo](https://github.com/protoface-ai/protoface-quickstart-videosdk) |
| Python | [SDK](https://github.com/protoface-ai/protoface-sdk-python) |
| Node.js | [SDK](https://github.com/protoface-ai/protoface-sdk-node) |
