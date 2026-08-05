# Protoface Quickstart for Agora Conversational AI

This quickstart shows two ways to add a real-time Protoface avatar to an Agora voice agent.

### Protoface client

LiveKit carries the avatar audio and video. Agora still powers the voice conversation, but the avatar runs alongside it through `protoface-client`.

Choose this option if you already use LiveKit or want to control the avatar directly from your frontend.

### Agora Agents SDK

Protoface joins the same Agora channel as the voice agent. Agora carries the conversation and the avatar audio and video, so you do not need LiveKit.

Choose this option if you want the avatar managed as part of your Agora agent.

## About Protoface

Protoface adds a real-time avatar to your AI app or agent.

Get a **free** API key at [protoface.com](https://protoface.com/?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-agora).

Read the docs at [docs.protoface.com](https://docs.protoface.com/?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-agora).

## Get started

1. Copy `.env.example` to `.env` and add your credentials.

```dotenv
# Required for both options
PROTOFACE_API_KEY="PROTOFACE-API-KEY"
PROTOFACE_AVATAR_ID="av_stock_001"

AGORA_APP_ID="AGORA-APP-ID"
AGORA_APP_CERTIFICATE="AGORA-APP-CERTIFICATE"
AGORA_CONVOAI_PIPELINE_ID="AGORA-AI-STUDIO-PIPELINE-ID"

# Required only for Protoface client
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

4. Choose **Protoface client** or **Agora Agents SDK**, then start a conversation.

## How it works

### Protoface client

The browser joins the Agora conversation and starts a separate Protoface session on LiveKit. When the Agora agent speaks, the browser sends that speech to Protoface. `protoface-client` then displays the talking avatar from LiveKit.

This option requires the three `LIVEKIT_*` variables shown above.

### Agora Agents SDK

The browser joins the Agora conversation first. The server then starts the voice agent and adds Protoface as its avatar. Protoface publishes the finished avatar audio and video back into the same Agora channel.

This option does not use LiveKit.

## Configure AI services in code

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

## More Protoface quickstarts

Protoface works with popular voice AI platforms.

| Platform | Link |
| --- | --- |
| LiveKit | [Plugin](https://github.com/livekit/agents/tree/main/livekit-plugins/livekit-plugins-protoface) [Official Docs](https://docs.livekit.io/agents/models/avatar/plugins/protoface/) |
| Pipecat | [Plugin](https://github.com/protoface-ai/protoface-plugin-pipecat) [Official Docs](https://docs.pipecat.ai/api-reference/server/services/video/protoface) |
| Protoface Managed Conversations | [Starter Repo](https://github.com/protoface-ai/protoface-quickstart-conversations) |
| Agora | [Starter Repo](https://github.com/protoface-ai/protoface-quickstart-agora) |
| Vapi | [Starter Repo](https://github.com/protoface-ai/protoface-quickstart-vapi) |
| ElevenLabs Agents | [Starter Repo](https://github.com/protoface-ai/protoface-quickstart-elevenlabs-agents) |
| OpenAI Realtime | [Starter Repo](https://github.com/protoface-ai/protoface-quickstart-openai-realtime) |
| VideoSDK | [Starter Repo](https://github.com/protoface-ai/protoface-quickstart-videosdk) |
| Python | [SDK](https://github.com/protoface-ai/protoface-sdk-python) |
| Node.js | [SDK](https://github.com/protoface-ai/protoface-sdk-node) |
