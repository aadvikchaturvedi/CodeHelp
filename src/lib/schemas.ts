import { z } from "zod";

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
  sessionId: z.string().optional(),
  attachedFile: z
    .object({
      name: z.string(),
      content: z.string(),
      language: z.string().optional(),
    })
    .optional(),
});

export const SessionSchema = z.object({
  sessionId: z.string(),
  tabs: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        language: z.string(),
      }),
    )
    .optional(),
  expandedIds: z.array(z.string()).optional(),
  chatHistory: z.array(ChatMessageSchema).optional(),
});

export const HighlightRequestSchema = z.object({
  content: z.string().min(1),
  language: z.string().min(1),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type HighlightRequest = z.infer<typeof HighlightRequestSchema>;

export const APIErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
  }),
});

export type APIError = z.infer<typeof APIErrorSchema>;
