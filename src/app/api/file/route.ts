import { NextRequest } from "next/server";
import { readFile, writeFile, stat } from "node:fs/promises";
import { resolve, normalize, relative, sep, isAbsolute } from "node:path";

interface FilePayload {
  path: string;
  workspaceRoot: string;
  content?: string;
}

function isPathInside(child: string, parent: string): boolean {
  const relativePath = relative(parent, child);
  return (
    relativePath !== "" &&
    !relativePath.startsWith(".." + sep) &&
    !isAbsolute(relativePath)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body: FilePayload = await request.json();

    if (!body || typeof body.path !== "string" || !body.path.trim()) {
      return Response.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "A valid file path is required.",
            retryable: false,
          },
        },
        { status: 400 },
      );
    }

    if (typeof body.workspaceRoot !== "string" || !body.workspaceRoot.trim()) {
      return Response.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "A valid workspaceRoot path is required.",
            retryable: false,
          },
        },
        { status: 400 },
      );
    }

    if (typeof body.content !== "string") {
      return Response.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "File content must be a string.",
            retryable: false,
          },
        },
        { status: 400 },
      );
    }

    let resolvedFile: string;
    let resolvedRoot: string;

    try {
      resolvedFile = resolve(normalize(body.path));
      resolvedRoot = resolve(normalize(body.workspaceRoot));
    } catch {
      return Response.json(
        {
          error: {
            code: "INVALID_PATH",
            message: "One or both paths are malformed.",
            retryable: false,
          },
        },
        { status: 400 },
      );
    }

    if (!isAbsolute(resolvedRoot)) {
      return Response.json(
        {
          error: {
            code: "INVALID_WORKSPACE",
            message: "workspaceRoot must be an absolute path.",
            retryable: false,
          },
        },
        { status: 400 },
      );
    }

    let rootStats;
    try {
      rootStats = await stat(resolvedRoot);
    } catch {
      return Response.json(
        {
          error: {
            code: "WORKSPACE_NOT_FOUND",
            message: "The workspace root directory does not exist.",
            retryable: false,
          },
        },
        { status: 404 },
      );
    }

    if (!rootStats.isDirectory()) {
      return Response.json(
        {
          error: {
            code: "WORKSPACE_NOT_DIRECTORY",
            message: "workspaceRoot must be a directory.",
            retryable: false,
          },
        },
        { status: 400 },
      );
    }

    if (!isPathInside(resolvedFile, resolvedRoot)) {
      return Response.json(
        {
          error: {
            code: "PATH_TRAVERSAL_DETECTED",
            message:
              "The target file path escapes the permitted workspace root. Directory traversal is not allowed.",
            retryable: false,
          },
        },
        { status: 403 },
      );
    }

    const parentDir = resolve(resolvedFile, "..");
    if (!isPathInside(parentDir, resolvedRoot)) {
      try {
        const parentStats = await stat(parentDir);
        if (!parentStats.isDirectory()) {
          return Response.json(
            {
              error: {
                code: "PARENT_NOT_DIRECTORY",
                message: "The parent of the target path is not a directory.",
                retryable: false,
              },
            },
            { status: 400 },
          );
        }
      } catch {
        return Response.json(
          {
            error: {
              code: "PARENT_NOT_FOUND",
              message: "The parent directory does not exist.",
              retryable: false,
            },
          },
          { status: 404 },
        );
      }
    }

    try {
      await writeFile(resolvedFile, body.content, { encoding: "utf-8" });
    } catch {
      return Response.json(
        {
          error: {
            code: "WRITE_FAILED",
            message: "Failed to write the file. Check permissions or disk space.",
            retryable: true,
          },
        },
        { status: 500 },
      );
    }

    return Response.json({
      success: true,
      path: relative(resolvedRoot, resolvedFile).split(sep).join("/"),
      size: Buffer.byteLength(body.content, "utf-8"),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      {
        error: {
          code: "FILE_WRITE_ERROR",
          message: `Failed to write file: ${message}`,
          retryable: true,
        },
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");
    const workspaceRoot = searchParams.get("workspaceRoot");

    if (!filePath || !filePath.trim()) {
      return Response.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "A valid ?path= query parameter is required.",
            retryable: false,
          },
        },
        { status: 400 },
      );
    }

    if (!workspaceRoot || !workspaceRoot.trim()) {
      return Response.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "A valid ?workspaceRoot= query parameter is required.",
            retryable: false,
          },
        },
        { status: 400 },
      );
    }

    let resolvedFile: string;
    let resolvedRoot: string;

    try {
      resolvedFile = resolve(normalize(filePath));
      resolvedRoot = resolve(normalize(workspaceRoot));
    } catch {
      return Response.json(
        {
          error: {
            code: "INVALID_PATH",
            message: "One or both paths are malformed.",
            retryable: false,
          },
        },
        { status: 400 },
      );
    }

    if (!isAbsolute(resolvedRoot)) {
      return Response.json(
        {
          error: {
            code: "INVALID_WORKSPACE",
            message: "workspaceRoot must be an absolute path.",
            retryable: false,
          },
        },
        { status: 400 },
      );
    }

    if (!isPathInside(resolvedFile, resolvedRoot)) {
      return Response.json(
        {
          error: {
            code: "PATH_TRAVERSAL_DETECTED",
            message:
              "The target file path escapes the permitted workspace root. Directory traversal is not allowed.",
            retryable: false,
          },
        },
        { status: 403 },
      );
    }

    let fileStats;
    try {
      fileStats = await stat(resolvedFile);
    } catch {
      return Response.json(
        {
          error: {
            code: "FILE_NOT_FOUND",
            message: "The specified file does not exist.",
            retryable: false,
          },
        },
        { status: 404 },
      );
    }

    if (!fileStats.isFile()) {
      return Response.json(
        {
          error: {
            code: "NOT_A_FILE",
            message: "The specified path is not a file.",
            retryable: false,
          },
        },
        { status: 400 },
      );
    }

    let content: string;
    try {
      content = await readFile(resolvedFile, { encoding: "utf-8" });
    } catch {
      return Response.json(
        {
          error: {
            code: "READ_FAILED",
            message: "Failed to read the file. It may be a binary file or permission is denied.",
            retryable: true,
          },
        },
        { status: 500 },
      );
    }

    const relativePath = relative(resolvedRoot, resolvedFile);

    return Response.json({
      path: relativePath.split(sep).join("/"),
      name: relativePath.split(sep).pop() ?? "unknown",
      size: fileStats.size,
      modifiedAt: fileStats.mtimeMs,
      content,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      {
        error: {
          code: "FILE_READ_ERROR",
          message: `Failed to read file: ${message}`,
          retryable: true,
        },
      },
      { status: 500 },
    );
  }
}
