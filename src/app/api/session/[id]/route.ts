import { NextRequest } from "next/server";
import { SessionSchema } from "@/lib/schemas";
import { cacheGet, cacheSet, cacheDelete } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return Response.json(
        { error: { code: "INVALID_SESSION", message: "Session ID required", retryable: false } },
        { status: 400 },
      );
    }

    const session = await cacheGet<Record<string, unknown>>(`session:${id}`);

    if (!session) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Session not found", retryable: false } },
        { status: 404 },
      );
    }

    return Response.json(session);
  } catch (err) {
    return Response.json(
      {
        error: {
          code: "SESSION_ERROR",
          message: err instanceof Error ? err.message : "Failed to load session",
          retryable: true,
        },
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return Response.json(
        { error: { code: "INVALID_SESSION", message: "Session ID required", retryable: false } },
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsed = SessionSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: parsed.error.issues[0]?.message ?? "Invalid session data",
            retryable: false,
          },
        },
        { status: 400 },
      );
    }

    await cacheSet(`session:${id}`, parsed.data, 86400 * 7);

    return Response.json({ saved: true, sessionId: id });
  } catch (err) {
    return Response.json(
      {
        error: {
          code: "SESSION_ERROR",
          message: err instanceof Error ? err.message : "Failed to save session",
          retryable: true,
        },
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await cacheDelete(`session:${id}`);
    return Response.json({ deleted: true });
  } catch (err) {
    return Response.json(
      {
        error: {
          code: "SESSION_ERROR",
          message: err instanceof Error ? err.message : "Failed to delete session",
          retryable: true,
        },
      },
      { status: 500 },
    );
  }
}
