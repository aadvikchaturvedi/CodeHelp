import Anthropic from "@anthropic-ai/sdk";

let anthropicClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic | null {
  if (anthropicClient) return anthropicClient;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  anthropicClient = new Anthropic({
    apiKey,
  });

  return anthropicClient;
}

export const SYSTEM_PROMPT =
  "You are CodeHelp Assistant, embedded in a developer's workspace. You have access to the currently open file(s) as context. Give concise, actionable answers. When returning code, use fenced code blocks with the correct language tag. Do not fabricate file contents you haven't been given.";

export interface ContextMessage {
  role: "user" | "assistant";
  content: string;
}

export interface FileAttachment {
  name: string;
  content: string;
  language?: string;
}

const MAX_CONTEXT_TOKENS = 80000;

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function truncateMessages(
  messages: ContextMessage[],
  maxTokens: number = MAX_CONTEXT_TOKENS,
): ContextMessage[] {
  let total = 0;
  const result: ContextMessage[] = [];

  for (let i = messages.length - 1; i >= 0; i--) {
    const tokens = estimateTokenCount(messages[i].content);
    if (total + tokens > maxTokens) {
      break;
    }
    total += tokens;
    result.unshift(messages[i]);
  }

  return result;
}

export async function streamChat(
  messages: ContextMessage[],
  fileAttachment?: FileAttachment,
): Promise<ReadableStream<Uint8Array>> {
  const client = getAnthropicClient();
  if (!client) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const truncated = truncateMessages(messages);

  let systemContent = SYSTEM_PROMPT;

  if (fileAttachment) {
    systemContent += `\n\nThe user has attached the following file:\n\`\`\`${fileAttachment.language ?? ""}\n// ${fileAttachment.name} (${fileAttachment.content.length} chars)\n${fileAttachment.content}\n\`\`\``;
  }

  const anthropicMessages = truncated.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  const stream = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemContent,
    messages: anthropicMessages,
    stream: true,
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            const sseData = JSON.stringify({
              type: "text",
              content: chunk.delta.text,
            });
            controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const errorData = JSON.stringify({
          type: "error",
          content: err instanceof Error ? err.message : "Stream failed",
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
    },
  });
}
