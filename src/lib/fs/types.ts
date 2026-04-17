// ─── Core FS Types ────────────────────────────────────────────────────────────

export type FileKind = "file" | "directory";

export interface FileNode {
    /** Stable unique id (path from root, e.g. "src/app/page.tsx") */
    id: string;
    name: string;
    kind: FileKind;
    children?: FileNode[]; // only for directories
    /** Underlying handle – undefined for OPFS-backed nodes */
    handle?: FileSystemFileHandle | FileSystemDirectoryHandle;
    /** True while the directory's children have not been expanded yet */
    isLazy?: boolean;
}

// ─── Editor Tab ───────────────────────────────────────────────────────────────

export interface EditorTab {
    id: string; // same as FileNode.id (the path)
    name: string;
    language: string;
    content: string;
    /** Content as it exists on disk – used for dirty detection */
    savedContent: string;
    isDirty: boolean;
    /** The actual handle to write back to disk */
    handle?: FileSystemFileHandle;
}

// ─── FS Provider Interface ────────────────────────────────────────────────────

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface IFileSystemProvider {
    /** Read a file's text content */
    readFile(handle: FileSystemFileHandle): Promise<string>;
    /** Write text content to a file */
    writeFile(handle: FileSystemFileHandle, content: string): Promise<void>;
    /** Create a new file inside a directory */
    createFile(
        dirHandle: FileSystemDirectoryHandle,
        name: string,
    ): Promise<FileSystemFileHandle>;
    /** Create a new directory inside a directory */
    createDirectory(
        dirHandle: FileSystemDirectoryHandle,
        name: string,
    ): Promise<FileSystemDirectoryHandle>;
    /** Delete an entry inside a directory */
    deleteEntry(
        dirHandle: FileSystemDirectoryHandle,
        name: string,
        recursive?: boolean,
    ): Promise<void>;
    /** Build a full FileNode tree from a root directory handle */
    buildTree(
        dirHandle: FileSystemDirectoryHandle,
        rootName?: string,
    ): Promise<FileNode[]>;
}

// ─── Language detection ────────────────────────────────────────────────────────

export function detectLanguage(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    const map: Record<string, string> = {
        ts: "typescript",
        tsx: "typescript",
        js: "javascript",
        jsx: "javascript",
        mjs: "javascript",
        cjs: "javascript",
        css: "css",
        scss: "scss",
        less: "less",
        html: "html",
        json: "json",
        jsonc: "json",
        md: "markdown",
        mdx: "markdown",
        yaml: "yaml",
        yml: "yaml",
        toml: "toml",
        py: "python",
        rs: "rust",
        go: "go",
        sh: "shell",
        bash: "shell",
        zsh: "shell",
        env: "plaintext",
        txt: "plaintext",
        svg: "xml",
        xml: "xml",
    };
    return map[ext] ?? "plaintext";
}
