# CodeHelp

A browser-first developer workspace built with Next.js, React, and Tailwind CSS. CodeHelp combines a browser IDE experience with local file system access, AI-assisted chat, and code completions.

## Features

- **Real folder editing**: open and edit files using the browser UI.
- **Monaco-powered editor**: VS Code-style editor experience.
- **AI-assist chat**: integrated Anthropic Claude streaming responses for workspace-aware assistance.
- **Code suggestions**: optional Ollama-based completion support using a local model.
- **Local caching**: optional Redis caching for repeated chat requests.
- **Modern stack**: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS.

## Repository Structure

- `src/app/` – Next.js app router pages, API routes, and layout.
- `src/components/` – reusable UI and landing page components.
- `src/lib/` – helper modules for Anthropic, Redis cache, and schema validation.
- `src/types/` – shared type definitions.
- `public/` – static assets.

## Getting Started

### Prerequisites

- Node.js 20+ (recommended)
- npm
- Optional: Redis for caching
- Optional: Ollama if you want local code completion support

### Install dependencies

```bash
npm install
```

### Run development server

```bash
npm run dev
```

Then open `http://localhost:3000` in your browser.

If port `3000` is in use, Next.js may fall back to another available port such as `3001`.

### Build and run production

```bash
npm run build
npm run start
```

### Lint

```bash
npm run lint
```

## Environment Variables

Create a `.env.local` file in the project root to configure the optional services.

```env
ANTHROPIC_API_KEY=your-anthropic-api-key
REDIS_URL=redis://localhost:6379
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=mistral
```

### Descriptions

- `ANTHROPIC_API_KEY` – required for the AI chat assistant at `src/app/api/chat/stream/route.ts`.
- `REDIS_URL` – optional Redis connection for caching chat responses in `src/lib/cache.ts`.
- `OLLAMA_BASE_URL` – optional local Ollama server URL for code suggestions.
- `OLLAMA_MODEL` – optional Ollama model name, defaults to `mistral`.

> If `ANTHROPIC_API_KEY` is not configured, the AI chat API will return a configuration error.

## Key Endpoints

- `POST /api/chat` – AI chat stream endpoint driven by Anthropic messages.
- `POST /api/chat/stream` – advanced streaming chat endpoint.
- `POST /api/suggest` – code completion endpoint using Ollama.
- `POST /api/fs` – file system browsing API for directory access on the host machine.

## Development Notes

- The app uses the Next.js App Router and server components by default.
- Client-side UI is built with Tailwind CSS and `@monaco-editor/react` for the editor experience.
- The AI assistant uses a workspace-aware system prompt and supports attached file payloads.
- Redis caching is implemented in `src/lib/cache.ts` and is optional.

## Useful Commands

- `npm install` – install dependencies
- `npm run dev` – start development server
- `npm run build` – build production assets
- `npm run start` – start production server
- `npm run lint` – run ESLint

## Troubleshooting

- If the dev server reports `Port 3000 is in use`, either stop the conflicting process or use the fallback port shown by Next.js.
- If `ANTHROPIC_API_KEY` is missing, set it in `.env.local` and restart the server.
- If code suggestions fail, verify the local Ollama server is reachable at `OLLAMA_BASE_URL`.
- If Redis is unavailable, the app continues to work without caching.

## License

This repository is currently private and configured for local development only.
