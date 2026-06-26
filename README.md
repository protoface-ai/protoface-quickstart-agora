# Protoface Quickstart for Agora Conversational AI Studio

This quickstart is an example of how to create a Protoface Avatar that runs in a Next.js app with the Protoface Node plugin and Agora Conversational AI Studio. 

## About Protoface

Protoface adds a real-time avatar to your AI app or agent.

Get a **free** API key at [protoface.com](https://protoface.com/?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-agora).

Read the docs at [docs.protoface.com](https://docs.protoface.com/?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-agora).

To see quickstarts for other platforms, visit the [quickstart repo](https://github.com/protoface-ai/protoface-quickstart).

## Usage

1. Rename `.env.example` to `.env` and paste your Protoface API key, your LiveKit secrets, and your Agora Conversational AI Studio details.

```js
PROTOFACE_API_KEY="PROTOFACE-API-KEY"
LIVEKIT_URL="wss://YOUR-LIVEKIT-PROJECT.livekit.cloud"
LIVEKIT_API_KEY="LIVEKIT-API-KEY"
LIVEKIT_API_SECRET="LIVEKIT-API-SECRET"

NEXT_PUBLIC_AGORA_APP_ID="AGORA-APP-ID"
AGORA_APP_CERTIFICATE="AGORA-APP-CERTIFICATE"
AGORA_CONVOAI_PIPELINE_ID="AGORA-AI-STUDIO-PIPELINE-ID"
NEXT_PUBLIC_PROTOFACE_AVATAR_ID="av_stock_001" // Optional (defaults to av_stock_001)
```

2. Install packages and link the local Protoface client.

```bash
npm install
npm link ../protoface-client
```

3. Run the app.

```bash
npm run dev
```

## How It Works

The app starts an Agora Conversational AI Studio session and a Protoface avatar session side by side:

1. The server route starts the configured Agora Conversational AI Studio pipeline.
2. The browser joins the Agora RTC channel and publishes microphone audio.
3. `ProtofaceClient.start()` connects the browser to the avatar session.
4. The app passes the agent's realtime speech to Protoface so the avatar speaks naturally.

Protoface is the visible and audible avatar output for the experience.

## Characters

You can swap out the character by finding one that you like in the [Protoface avatar docs](https://docs.protoface.com/guides/avatars?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-agora), or create your own.

`av_stock_001` `av_stock_002` `av_stock_003` `custom_avatar_id`

## Deploy on Vercel

An easy way to deploy your avatar interaction is to use the [Vercel Platform](https://vercel.com/new?filter=next.js).
