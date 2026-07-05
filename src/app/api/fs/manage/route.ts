import { NextRequest } from "next/server";
import { writeFile, mkdir, rm, stat } from "node:fs/promises";
import { resolve, normalize, relative, sep, isAbsolute, join } from "node:path";

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
    const body = await request.json();
    const { action, path, workspaceRoot, name } = body || {};

    if (!action || !path || !workspaceRoot) {
      return Response.json(
        { error: { code: "MISSING_FIELDS", message: "action, path, and workspaceRoot are required." } },
        { status: 400 },
      );
    }

    if (!["createFile", "createDir", "delete"].includes(action)) {
      return Response.json(
        { error: { code: "INVALID_ACTION", message: `Unknown action: ${action}` } },
        { status: 400 },
      );
    }

    let resolvedRoot: string;
    let resolvedTarget: string;

    try {
      resolvedRoot = resolve(normalize(workspaceRoot));
    } catch {
      return Response.json(
        { error: { code: "INVALID_ROOT", message: "workspaceRoot path is malformed." } },
        { status: 400 },
      );
    }

    if (!isAbsolute(resolvedRoot)) {
      return Response.json(
        { error: { code: "ROOT_NOT_ABSOLUTE", message: "workspaceRoot must be an absolute path." } },
        { status: 400 },
      );
    }

    let rootStats;
    try {
      rootStats = await stat(resolvedRoot);
    } catch {
      return Response.json(
        { error: { code: "ROOT_NOT_FOUND", message: "workspaceRoot does not exist." } },
        { status: 404 },
      );
    }

    if (!rootStats.isDirectory()) {
      return Response.json(
        { error: { code: "ROOT_NOT_DIR", message: "workspaceRoot is not a directory." } },
        { status: 400 },
      );
    }

    try {
      if (action === "createFile" || action === "createDir") {
        if (!name || typeof name !== "string" || !name.trim()) {
          return Response.json(
            { error: { code: "NAME_REQUIRED", message: "A non-empty name is required." } },
            { status: 400 },
          );
        }
        const resolvedParent = resolve(normalize(path));
        if (resolvedParent !== resolvedRoot && !isPathInside(resolvedParent, resolvedRoot)) {
          return Response.json(
            { error: { code: "TRAVERSAL", message: "Parent path escapes workspace root." } },
            { status: 403 },
          );
        }
        resolvedTarget = join(resolvedParent, name.trim());
        if (!isPathInside(resolvedTarget, resolvedRoot)) {
          return Response.json(
            { error: { code: "TRAVERSAL", message: "Target path escapes workspace root." } },
            { status: 403 },
          );
        }
      } else {
        resolvedTarget = resolve(normalize(path));
        if (!isPathInside(resolvedTarget, resolvedRoot)) {
          return Response.json(
            { error: { code: "TRAVERSAL", message: "Target path escapes workspace root." } },
            { status: 403 },
          );
        }
      }
    } catch {
      return Response.json(
        { error: { code: "INVALID_PATH", message: "One or more paths are malformed." } },
        { status: 400 },
      );
    }

    try {
      switch (action) {
        case "createFile":
          await writeFile(resolvedTarget, "", "utf-8");
          break;
        case "createDir":
          await mkdir(resolvedTarget, { recursive: true });
          break;
        case "delete":
          await rm(resolvedTarget, { recursive: true, force: true });
          break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return Response.json(
        { error: { code: "ACTION_FAILED", message: msg, retryable: true } },
        { status: 500 },
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: { code: "MANAGE_ERROR", message } },
      { status: 500 },
    );
  }
}
