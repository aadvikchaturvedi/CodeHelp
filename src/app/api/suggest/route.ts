import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const MODEL = process.env.OLLAMA_MODEL || "mistral";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, language, cursorLine } = body || {};

    if (!code || typeof code !== "string") {
      return Response.json(
        { error: { code: "INVALID_INPUT", message: "A 'code' string is required.", retryable: false } },
        { status: 400 },
      );
    }

    const lines = code.split("\n");
    const contextBefore = lines.slice(Math.max(0, (cursorLine ?? 0) - 15), cursorLine ?? lines.length).join("\n");
    const contextAfter = lines.slice(cursorLine ?? lines.length, (cursorLine ?? lines.length) + 5).join("\n");

    const prompt = `You are a code completion engine. Given the code context below, suggest the most likely next line or completion. Return ONLY the completion text, no explanation, no backticks.\n\nLanguage: ${language || "auto"}\n\nCode before cursor:\n\`\`\`\n${contextBefore}\n\`\`\`\n${contextAfter ? `\nCode after cursor:\n\`\`\`\n${contextAfter}\n\`\`\`` : ""}\n\nCompletion:`;

    const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.05, max_tokens: 64 },
      }),
    });

    if (!res.ok) {
      return Response.json(
        { error: { code: "OLLAMA_ERROR", message: `Ollama returned ${res.status}`, retryable: true } },
        { status: 502 },
      );
    }

    const data = await res.json();
    const suggestion = (data.response || "").trim();

    return Response.json({ suggestion, language: language || "auto" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: { code: "SUGGEST_ERROR", message, retryable: true } },
      { status: 500 },
    );
  }
}
