import { NextRequest } from "next/server";
import { HighlightRequestSchema } from "@/lib/schemas";
import { cacheGet, cacheSet, hashContent } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch);
}

const KEYWORDS: Record<string, string[]> = {
  typescript: [
    "const", "let", "var", "function", "return", "if", "else", "for", "while",
    "do", "switch", "case", "break", "continue", "new", "this", "class",
    "import", "export", "from", "async", "await", "try", "catch", "throw",
    "interface", "type", "extends", "implements", "enum", "typeof",
    "instanceof", "in", "of", "as", "any", "void", "never", "unknown",
    "undefined", "null", "true", "false", "super", "static", "private",
    "protected", "public", "readonly", "abstract", "declare", "namespace",
    "module", "require", "yield", "with", "delete", "default",
  ],
  javascript: [
    "const", "let", "var", "function", "return", "if", "else", "for", "while",
    "do", "switch", "case", "break", "continue", "new", "this", "class",
    "import", "export", "from", "async", "await", "try", "catch", "throw",
    "typeof", "instanceof", "in", "of", "undefined", "null", "true", "false",
    "super", "yield", "delete", "void",
  ],
  python: [
    "def", "class", "return", "if", "elif", "else", "for", "while", "import",
    "from", "as", "try", "except", "finally", "with", "async", "await",
    "yield", "lambda", "pass", "break", "continue", "raise", "and", "or",
    "not", "is", "in", "True", "False", "None", "self", "global", "nonlocal",
  ],
};

const RESERVED = new Set(Object.values(KEYWORDS).flat());

const COMMENT_SINGLE = /\/\/.*$/gm;
const COMMENT_BLOCK = /\/\*[\s\S]*?\*\//g;
const STRING_DQ = /"(?:[^"\\]|\\.)*"/g;
const STRING_SQ = /'(?:[^'\\]|\\.)*'/g;
const STRING_TQ = /`(?:[^`\\]|\\.)*`/g;
const NUMBER = /\b(\d+\.?\d*|0x[0-9a-fA-F]+|0b[01]+)\b/g;

function highlightLine(line: string): string {
  const escaped = escapeHtml(line);

  const patterns: [RegExp, string][] = [
    [COMMENT_SINGLE, "comment"],
    [COMMENT_BLOCK, "comment"],
    [STRING_DQ, "string"],
    [STRING_SQ, "string"],
    [STRING_TQ, "string"],
  ];

  const allMatches: { index: number; length: number; cls: string }[] = [];

  for (const [regex, cls] of patterns) {
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(escaped)) !== null) {
      allMatches.push({ index: m.index, length: m[0].length, cls });
    }
  }

  allMatches.sort((a, b) => a.index - b.index);

  const wordRegex = /\b([a-zA-Z_$]\w*)\b/g;
  let m: RegExpExecArray | null;
  while ((m = wordRegex.exec(escaped)) !== null) {
    const word = m[0];
    if (RESERVED.has(word)) {
      allMatches.push({ index: m.index, length: word.length, cls: "keyword" });
    }
  }

  const numberRegex = NUMBER;
  numberRegex.lastIndex = 0;
  while ((m = numberRegex.exec(escaped)) !== null) {
    allMatches.push({ index: m.index, length: m[0].length, cls: "number" });
  }

  allMatches.sort((a, b) => a.index - b.index);

  const merged = mergeOverlapping(allMatches);

  if (merged.length === 0) return escaped;

  let result = "";
  let pos = 0;

  for (const match of merged) {
    if (match.index > pos) {
      result += escaped.slice(pos, match.index);
    }
    result += `<span class="hl-${match.cls}">${escaped.slice(match.index, match.index + match.length)}</span>`;
    pos = match.index + match.length;
  }

  if (pos < escaped.length) {
    result += escaped.slice(pos);
  }

  return result;
}

function mergeOverlapping(
  matches: { index: number; length: number; cls: string }[],
): { index: number; length: number; cls: string }[] {
  if (matches.length === 0) return [];

  matches.sort((a, b) => a.index - b.index);

  const merged: typeof matches = [matches[0]];

  for (let i = 1; i < matches.length; i++) {
    const last = merged[merged.length - 1];
    const current = matches[i];

    if (current.index < last.index + last.length) {
      if (current.length > last.length) {
        merged[merged.length - 1] = current;
      }
    } else {
      merged.push(current);
    }
  }

  return merged;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = HighlightRequestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "Invalid highlight request",
            retryable: false,
          },
        },
        { status: 400 },
      );
    }

    const { content, language } = parsed.data;
    const cacheKey = `highlight:${hashContent(content)}:${language}`;

    const cached = await cacheGet<string>(cacheKey);
    if (cached) {
      return Response.json(
        { html: cached, cached: true },
        {
          headers: {
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        },
      );
    }

    const lines = content.split("\n");
    const highlighted = lines.map((line) => highlightLine(line));

    const html = `<pre class="hl-code"><code>${highlighted.join("\n")}</code></pre>`;

    await cacheSet(cacheKey, html, 86400);

    return Response.json(
      { html, cached: false },
      {
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      },
    );
  } catch (err) {
    return Response.json(
      {
        error: {
          code: "HIGHLIGHT_ERROR",
          message: err instanceof Error ? err.message : "Highlight failed",
          retryable: true,
        },
      },
      { status: 500 },
    );
  }
}
