# Protoface Quickstart for Agora Conversational AI Studio

This quickstart is the easiest way to serve a Protoface Avatar connected to Agora Conversational AI. Simply follow the steps listed below.

## About Protoface

Protoface adds a real-time avatar to your AI app or agent.

Get a **free** API key at [protoface.com](https://protoface.com/?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-agora).

Read the docs at [docs.protoface.com](https://docs.protoface.com/?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-agora).

To see quickstarts for other platforms, visit the [quickstart repo](https://github.com/protoface-ai/protoface-quickstart).

## Get Started

1. Copy `.env.example` for your local `.env` file and put in your Protoface API key, your LiveKit secrets, and your Agora Conversational AI Studio details.

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

2. Install the needed packages.

```bash
npm install
```

3. Run the dev server and head to [the site](http://localhost:3000).

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

## Avatars

Find avatars you like or create your own on [the Protoface dashboard](https://app.protoface.com?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-agora). Replace the `.env` value for `NEXT_PUBLIC_PROTOFACE_AVATAR_ID` to swap the stock avatar with one of your choosing.

Alternatively, find the API spec for creating, retrieving, and maintaing avatars at [docs.protoface.com](https://docs.protoface.com/guides/avatars?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-agora).