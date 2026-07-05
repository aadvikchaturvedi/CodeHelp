import { NextRequest } from "next/server";
import { ChatRequestSchema } from "@/lib/schemas";
import { streamChat } from "@/lib/anthropic";
import { cacheGet, cacheSet, hashContent } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: parsed.error.issues[0]?.message ?? "Invalid request",
            retryable: false,
          },
        },
        { status: 400 },
      );
    }

    const { messages, attachedFile } = parsed.data;

    const lastUserMsg = messages.filter((m) => m.role === "user").pop();
    let cacheKey: string | null = null;

    if (lastUserMsg && !attachedFile) {
      const systemPrompt =
        "role: assistant, system: You are CodeHelp Assistant embedded in a developer's workspace.";
      const raw =
        systemPrompt +
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

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }
    }

    const anthropicMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const fileAttachment = attachedFile
      ? {
          name: attachedFile.name,
          content: attachedFile.content,
          language: attachedFile.language,
        }
      : undefined;

    const aiStream = await streamChat(anthropicMessages, fileAttachment);

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    let fullResponse = "";

    const reader = aiStream.getReader();

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (cacheKey && fullResponse) {
              cacheSet(cacheKey, fullResponse, 600).catch(() => {});
            }
            await writer.write(encoder.encode("data: [DONE]\n\n"));
            await writer.close();
            return;
          }

          const chunk = new TextDecoder().decode(value);
          const sseLines = chunk.split("\n");
          for (const line of sseLines) {
            if (line.startsWith("data: ") && !line.includes("[DONE]")) {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.type === "text") {
                  fullResponse += parsed.content;
                }
              } catch {}
            }
          }

          await writer.write(value);
        }
      } catch (err) {
        const errorData = JSON.stringify({
          type: "error",
          content: err instanceof Error ? err.message : "Stream failed",
        });
        await writer.write(
          encoder.encode(`data: ${errorData}\n\n`),
        );
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const isConfigError = message.includes("ANTHROPIC_API_KEY");
    return Response.json(
      {
        error: {
          code: isConfigError ? "AI_NOT_CONFIGURED" : "STREAM_ERROR",
          message: isConfigError
            ? "AI assistant is not configured. Set ANTHROPIC_API_KEY to enable."
            : "Failed to generate response",
          retryable: !isConfigError,
        },
      },
      { status: isConfigError ? 503 : 500 },
    );
  }
}
