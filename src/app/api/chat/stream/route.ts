import { NextRequest } from "next/server";
import { ChatRequestSchema } from "@/lib/schemas";
import { isAnthropicConfigured, streamChat, SYSTEM_PROMPT } from "@/lib/anthropic";
import { cacheGet, cacheSet, hashContent } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAT_CACHE_TTL_SECONDS = 600;

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

function errorResponse(
  status: number,
  code: string,
  message: string,
  retryable: boolean,
) {
  return Response.json({ error: { code, message, retryable } }, { status });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_INPUT", "Request body must be valid JSON.", false);
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      400,
      "INVALID_INPUT",
      parsed.error.issues[0]?.message ?? "Invalid request",
      false,
    );
  }

  // The key only ever lives in the server environment; the client just gets
  // told that it is missing.
  if (!isAnthropicConfigured()) {
    return errorResponse(
      503,
      "AI_NOT_CONFIGURED",
      "Claude is not configured on this server. Set ANTHROPIC_API_KEY in the server environment (e.g. .env.local) and restart, or switch the provider to Ollama.",
      false,
    );
  }

  // Abort the upstream Anthropic request when the browser goes away.
  const upstream = new AbortController();
  if (request.signal.aborted) upstream.abort();
  else {
    request.signal.addEventListener("abort", () => upstream.abort(), {
      once: true,
    });
  }

  try {
    const { messages, attachedFile } = parsed.data;

    const lastUserMsg = messages.filter((m) => m.role === "user").pop();
    let cacheKey: string | null = null;

    if (lastUserMsg && !attachedFile) {
      const raw =
        SYSTEM_PROMPT +
        messages.map((m) => `${m.role}: ${m.content}`).join("\n");
      cacheKey = `chat:${hashContent(raw)}`;
      const cached = await cacheGet<string>(cacheKey);
      if (cached) {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text", content: cached })}\n\n`,
              ),
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });

        return new Response(stream, { headers: SSE_HEADERS });
      }
    }

    const fileAttachment = attachedFile
      ? {
          name: attachedFile.name,
          content: attachedFile.content,
          language: attachedFile.language,
        }
      : undefined;

    const aiStream = await streamChat(messages, fileAttachment, upstream.signal);
    const reader = aiStream.getReader();
    const decoder = new TextDecoder();

    let fullResponse = "";
    let sawError = false;

    // Pass frames through unchanged while accumulating the text for the cache.
    // streamChat already terminates the stream with `data: [DONE]`.
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            // Only complete, successful answers are worth caching.
            if (cacheKey && fullResponse && !sawError && !upstream.signal.aborted) {
              cacheSet(cacheKey, fullResponse, CHAT_CACHE_TTL_SECONDS).catch(() => {});
            }
            controller.close();
            return;
          }

          for (const line of decoder.decode(value, { stream: true }).split("\n")) {
            if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
            try {
              const frame = JSON.parse(line.slice(6));
              if (frame.type === "text") fullResponse += frame.content;
              else if (frame.type === "error") sawError = true;
            } catch {}
          }

          controller.enqueue(value);
        } catch (err) {
          if (upstream.signal.aborted) {
            try { controller.close(); } catch {}
            return;
          }
          const errorData = JSON.stringify({
            type: "error",
            content: err instanceof Error ? err.message : "Stream failed",
          });
          try {
            controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
            controller.close();
          } catch {}
        }
      },
      cancel() {
        upstream.abort();
        reader.cancel().catch(() => {});
      },
    });

    return new Response(stream, { headers: SSE_HEADERS });
  } catch (err) {
    if (upstream.signal.aborted) {
      // Client closed request; nothing useful to send back.
      return new Response(null, { status: 499 });
    }
    console.error("[chat/stream] upstream error:", err);
    const status =
      typeof (err as { status?: unknown })?.status === "number"
        ? (err as { status: number }).status
        : 0;
    if (status === 401 || status === 403) {
      return errorResponse(
        502,
        "AI_AUTH_FAILED",
        "Anthropic rejected the server's ANTHROPIC_API_KEY. Check the key in the server environment.",
        false,
      );
    }
    if (status === 429) {
      return errorResponse(429, "AI_RATE_LIMITED", "Claude is rate limited right now. Try again shortly.", true);
    }
    return errorResponse(502, "STREAM_ERROR", "Claude request failed. Try again.", true);
  }
}
