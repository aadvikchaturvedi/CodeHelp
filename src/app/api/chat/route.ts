import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const MODEL = process.env.OLLAMA_MODEL || "mistral";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  currentOpenFile?: string;
  currentCodeSnippet?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequestBody = await request.json();

    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return Response.json(
        { error: { code: "INVALID_INPUT", message: "A non-empty 'messages' array is required.", retryable: false } },
        { status: 400 },
      );
    }

    for (const msg of body.messages) {
      if (typeof msg.role !== "string" || !["user", "assistant"].includes(msg.role) || typeof msg.content !== "string") {
        return Response.json(
          { error: { code: "INVALID_MESSAGE_FORMAT", message: "Each message must have { role, content }.", retryable: false } },
          { status: 400 },
        );
      }
    }

    try {
      const health = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(2000) });
      if (!health.ok) throw new Error("Not OK");
    } catch {
      return Response.json(
        { error: { code: "OLLAMA_NOT_FOUND", message: `Ollama is not running at ${OLLAMA_BASE}. Start it with 'ollama serve'.`, retryable: true } },
        { status: 503 },
      );
    }

    let systemMsg = "You are CodeHelp Agent — a razor-sharp coding partner. Be concise. Prefer code over explanation. Every code block must include a language identifier. Never fabricate APIs.";
    if (body.currentOpenFile && body.currentCodeSnippet) {
      systemMsg += `\n\nCurrently open file: ${body.currentOpenFile}\n\`\`\`\n${body.currentCodeSnippet}\n\`\`\``;
    }

    const ollamaMessages = [{ role: "system", content: systemMsg }, ...body.messages];

    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: ollamaMessages,
        stream: true,
        options: { temperature: 0.1 },
      }),
    });

    if (!res.ok) {
      return Response.json(
        { error: { code: "OLLAMA_ERROR", message: `Ollama returned ${res.status}`, retryable: true } },
        { status: 502 },
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    let buffer = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              try {
                const parsed = JSON.parse(trimmed);
                if (parsed.done) continue;
                const content = parsed.message?.content ?? "";
                if (content) {
                  const sseData = JSON.stringify({ type: "text", content });
                  controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
                }
              } catch {}
            }
          }

          if (buffer.trim()) {
            try {
              const parsed = JSON.parse(buffer.trim());
              const content = parsed.message?.content ?? "";
              if (content) {
                const sseData = JSON.stringify({ type: "text", content });
                controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
              }
            } catch {}
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          const errorData = JSON.stringify({ type: "error", content: err instanceof Error ? err.message : "Stream failed" });
          try { controller.enqueue(encoder.encode(`data: ${errorData}\n\n`)); controller.close(); } catch {}
        }
      },
      cancel() { reader.cancel().catch(() => {}); },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: { code: "CHAT_ERROR", message: `Chat failed: ${message}`, retryable: true } },
      { status: 500 },
    );
  }
}
