import { NextRequest } from "next/server";
import { readdir, stat, readlink } from "node:fs/promises";
import { join, relative, resolve, sep, isAbsolute, normalize } from "node:path";

interface FsNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FsNode[];
}

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  "dist",
  "build",
  ".cache",
  ".svn",
  ".hg",
  ".idea",
  ".vscode",
  "coverage",
  ".nyc_output",
  "__pycache__",
  ".DS_Store",
  "Thumbs.db",
]);

const MAX_DEPTH = 12;
const MAX_CHILDREN = 5000;

interface ReadDirOptions {
  dirPath: string;
  depth: number;
  workspaceRoot: string;
  totalNodes: { count: number };
}

async function readDirRecursive({
  dirPath,
  depth,
  workspaceRoot,
  totalNodes,
}: ReadDirOptions): Promise<FsNode[]> {
  if (depth > MAX_DEPTH) return [];
  if (totalNodes.count >= MAX_CHILDREN) return [];

  let entries: string[];
  try {
    entries = await readdir(dirPath, { withFileTypes: false });
  } catch {
    return [];
  }

  const nodes: FsNode[] = [];

  for (const name of entries) {
    if (totalNodes.count >= MAX_CHILDREN) break;

    const fullPath = join(dirPath, name);
    let stats;
    try {
      stats = await stat(fullPath);
    } catch {
      continue;
    }

    if (IGNORED_DIRS.has(name)) continue;

    const relativePath = relative(workspaceRoot, fullPath);

    if (stats.isDirectory()) {
      totalNodes.count++;
      const children = await readDirRecursive({
        dirPath: fullPath,
        depth: depth + 1,
        workspaceRoot,
        totalNodes,
      });
      nodes.push({
        name,
        path: relativePath.split(sep).join("/"),
        isDirectory: true,
        children: children.length > 0 ? children : undefined,
      });
    } else if (stats.isFile()) {
      totalNodes.count++;
      nodes.push({
        name,
        path: relativePath.split(sep).join("/"),
        isDirectory: false,
      });
    } else if (stats.isSymbolicLink()) {
      try {
        const target = await readlink(fullPath);
        const targetStats = await stat(fullPath);
        if (targetStats.isDirectory()) {
          totalNodes.count++;
          const children = await readDirRecursive({
            dirPath: fullPath,
            depth: depth + 1,
            workspaceRoot,
            totalNodes,
          });
          nodes.push({
            name: `${name} -> ${target}`,
            path: relativePath.split(sep).join("/"),
            isDirectory: true,
            children: children.length > 0 ? children : undefined,
          });
        }
      } catch {
        // broken symlink — skip
      }
    }
  }

  nodes.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return nodes;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body.path !== "string" || !body.path.trim()) {
      return Response.json(
        {
          error: {
            code: "INVALID_PATH",
            message: "A valid absolute directory path is required.",
            retryable: false,
          },
        },
        { status: 400 },
      );
    }

    const rawPath = body.path.trim();

    let resolved: string;
    try {
      resolved = resolve(normalize(rawPath));
    } catch {
      return Response.json(
        {
          error: {
            code: "INVALID_PATH",
            message: "The provided path is malformed.",
            retryable: false,
          },
        },
        { status: 400 },
      );
    }

    if (!isAbsolute(resolved)) {
      return Response.json(
        {
          error: {
            code: "NOT_ABSOLUTE",
            message: "Only absolute paths are accepted.",
            retryable: false,
          },
        },
        { status: 400 },
      );
    }

    let rootStats;
    try {
      rootStats = await stat(resolved);
    } catch {
      return Response.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "The specified directory does not exist or is inaccessible.",
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
            code: "NOT_A_DIRECTORY",
            message: "The specified path is not a directory.",
            retryable: false,
          },
        },
        { status: 400 },
      );
    }

    const totalNodes = { count: 0 };
    const children = await readDirRecursive({
      dirPath: resolved,
      depth: 0,
      workspaceRoot: resolved,
      totalNodes,
    });

    const tree: FsNode = {
      name: resolved.split(sep).pop() ?? "root",
      path: ".",
      isDirectory: true,
      children: children.length > 0 ? children : undefined,
    };

    return Response.json({
      tree,
      totalNodes: totalNodes.count,
      truncated: totalNodes.count >= MAX_CHILDREN,
      workspaceRoot: resolved,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      {
        error: {
          code: "FS_READ_ERROR",
          message: `Failed to read directory: ${message}`,
          retryable: true,
        },
      },
      { status: 500 },
    );
  }
}
