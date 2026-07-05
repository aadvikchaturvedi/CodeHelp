interface BackendFsNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: BackendFsNode[];
}

interface ApiTreeResponse {
  tree: BackendFsNode;
  totalNodes: number;
  truncated: boolean;
  workspaceRoot: string;
}

interface ApiFileReadResponse {
  path: string;
  name: string;
  size: number;
  modifiedAt: number;
  content: string;
}

export const BackendFSProvider = {
  async readDir(workspaceRoot: string): Promise<{
    tree: BackendFsNode;
    truncated: boolean;
  }> {
    const res = await fetch("/api/fs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: workspaceRoot }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message ?? `readDir failed (${res.status})`);
    }
    const data: ApiTreeResponse = await res.json();
    return { tree: data.tree, truncated: data.truncated };
  },

  async readFile(filePath: string, workspaceRoot: string): Promise<string> {
    const params = new URLSearchParams({ path: filePath, workspaceRoot });
    const res = await fetch(`/api/file?${params}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message ?? `readFile failed (${res.status})`);
    }
    const data: ApiFileReadResponse = await res.json();
    return data.content;
  },

  async writeFile(filePath: string, workspaceRoot: string, content: string): Promise<void> {
    const res = await fetch("/api/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath, workspaceRoot, content }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message ?? `writeFile failed (${res.status})`);
    }
  },

  async createFile(parentPath: string, workspaceRoot: string, name: string): Promise<void> {
    const res = await fetch("/api/fs/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "createFile", path: parentPath, workspaceRoot, name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message ?? `createFile failed (${res.status})`);
    }
  },

  async createDirectory(parentPath: string, workspaceRoot: string, name: string): Promise<void> {
    const res = await fetch("/api/fs/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "createDir", path: parentPath, workspaceRoot, name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message ?? `createDir failed (${res.status})`);
    }
  },

  async deleteEntry(targetPath: string, workspaceRoot: string): Promise<void> {
    const res = await fetch("/api/fs/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", path: targetPath, workspaceRoot }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message ?? `delete failed (${res.status})`);
    }
  },
};
