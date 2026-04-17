/**
 * Native File System Access API provider.
 * Uses `window.showDirectoryPicker()` to mount a real folder from disk.
 *
 * All reads/writes go directly through the browser's FileSystem handles —
 * no network, no server, no intermediate copies.
 */

import type { FileNode, IFileSystemProvider } from "./types";

// Directories we never show in the tree (same as VSCode defaults)
const IGNORED_NAMES = new Set([
    "node_modules",
    ".git",
    ".next",
    ".turbo",
    "dist",
    "build",
    ".cache",
    ".DS_Store",
    "Thumbs.db",
]);

export const NativeFSProvider: IFileSystemProvider = {
    // ── Read ──────────────────────────────────────────────────────────────────
    async readFile(handle: FileSystemFileHandle): Promise<string> {
        const file = await handle.getFile();
        return file.text();
    },

    // ── Write ─────────────────────────────────────────────────────────────────
    async writeFile(handle: FileSystemFileHandle, content: string): Promise<void> {
        // keepExistingData: false → truncate then write (correct for saves)
        const writable = await handle.createWritable({ keepExistingData: false });
        await writable.write(content);
        await writable.close();
    },

    // ── Create file ───────────────────────────────────────────────────────────
    async createFile(
        dirHandle: FileSystemDirectoryHandle,
        name: string,
    ): Promise<FileSystemFileHandle> {
        const fileHandle = await dirHandle.getFileHandle(name, { create: true });
        // Write empty content so the file actually exists on disk
        const writable = await fileHandle.createWritable({ keepExistingData: false });
        await writable.write("");
        await writable.close();
        return fileHandle;
    },

    // ── Create directory ──────────────────────────────────────────────────────
    async createDirectory(
        dirHandle: FileSystemDirectoryHandle,
        name: string,
    ): Promise<FileSystemDirectoryHandle> {
        return dirHandle.getDirectoryHandle(name, { create: true });
    },

    // ── Delete ────────────────────────────────────────────────────────────────
    async deleteEntry(
        dirHandle: FileSystemDirectoryHandle,
        name: string,
        recursive = true,
    ): Promise<void> {
        await dirHandle.removeEntry(name, { recursive });
    },

    // ── Build tree ────────────────────────────────────────────────────────────
    async buildTree(
        dirHandle: FileSystemDirectoryHandle,
        rootName?: string,
    ): Promise<FileNode[]> {
        return buildNodes(dirHandle, rootName ?? dirHandle.name, "");
    },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Recursively build the FileNode tree.
 * @param dirHandle  The directory to enumerate
 * @param dirName    Name of this directory (for display)
 * @param parentPath Path prefix built so far (e.g. "src/app")
 */
async function buildNodes(
    dirHandle: FileSystemDirectoryHandle,
    dirName: string,
    parentPath: string,
): Promise<FileNode[]> {
    const nodes: FileNode[] = [];
    const currentPath = parentPath ? `${parentPath}/${dirName}` : dirName;

    for await (const [name, handle] of dirHandle.entries()) {
        if (IGNORED_NAMES.has(name)) continue;

        const id = `${currentPath}/${name}`;

        if (handle.kind === "directory") {
            // Recursively expand all directories eagerly (for sidebar tree)
            const children = await buildNodes(
                handle as FileSystemDirectoryHandle,
                name,
                currentPath,
            );
            nodes.push({
                id,
                name,
                kind: "directory",
                handle: handle as FileSystemDirectoryHandle,
                children,
            });
        } else {
            nodes.push({
                id,
                name,
                kind: "file",
                handle: handle as FileSystemFileHandle,
            });
        }
    }

    // Sort: directories first, then files, both alphabetically
    return nodes.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
}

// ── Compatibility check ───────────────────────────────────────────────────────

export function isNativeFSSupported(): boolean {
    return (
        typeof window !== "undefined" &&
        "showDirectoryPicker" in window
    );
}
