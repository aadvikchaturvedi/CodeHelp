"use client";

/**
 * Enhanced Explorer Sidebar — VS Code / Cursor‑style file tree.
 *
 * Uses Zustand (`useExplorerStore`) for efficient deep‑tree updates
 * and keeps a separate `FileNode[]` mirror to pass into `compileWorkspaceContext`.
 *
 * Features:
 *   - Zustand‑driven tree state
 *   - Indentation guides with chevron collapse/expand
 *   - File‑type icons (TS, JS, JSON, …) with colour
 *   - Active file highlight
 *   - Inline CRUD: create, rename, delete
 *   - Right‑click context menu
 *   - AI context compilation (top‑bar button)
 */

import React, { useCallback, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Code2,
  File,
  FileCode2,
  FileJson,
  FileText,
  FilePlus,
  Folder,
  FolderOpen,
  FolderPlus,
  GitBranch,
  Globe,
  Palette,
  Package,
  Settings,
  Trash2,
  FolderInput,
  Loader2,
  X,
} from "lucide-react";
import type { FileSystemNode } from "@/lib/fs/explorer-types";
import { useExplorerStore, compileWorkspaceContext } from "@/lib/fs/explorer-store";

// ─── Icon helpers ──────────────────────────────────────────────────────────────

function getFileIcon(name: string): { Icon: React.FC<{ size?: number; className?: string }>; color: string } {
  const ext = name.split(".").pop()?.toLowerCase();
  if (name.startsWith(".git")) return { Icon: GitBranch, color: "text-red-400" };
  if (name === "package.json") return { Icon: Package, color: "text-green-400" };
  if (ext === "tsx" || ext === "jsx") return { Icon: Code2, color: "text-blue-400" };
  if (ext === "ts") return { Icon: Code2, color: "text-blue-300" };
  if (ext === "js") return { Icon: FileCode2, color: "text-yellow-400" };
  if (ext === "css") return { Icon: Palette, color: "text-purple-400" };
  if (ext === "md") return { Icon: FileText, color: "text-orange-400" };
  if (ext === "json") return { Icon: FileJson, color: "text-amber-300" };
  if (ext === "html") return { Icon: Globe, color: "text-blue-300" };
  return { Icon: File, color: "text-zinc-400" };
}

function getFolderIcon(name: string, open: boolean): { Icon: React.FC<{ size?: number; className?: string }>; color: string } {
  if (name === "node_modules") return { Icon: Package, color: "text-green-400" };
  if (name === ".next") return { Icon: Settings, color: "text-yellow-400" };
  if (name === ".git") return { Icon: GitBranch, color: "text-red-400" };
  if (name === "public") return { Icon: Globe, color: "text-blue-300" };
  return { Icon: open ? FolderOpen : Folder, color: "text-amber-400" };
}

// ─── Inline input ──────────────────────────────────────────────────────────────

interface InlineInputProps {
  placeholder: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  indent: number;
}

function InlineInput({ placeholder, onConfirm, onCancel, indent }: InlineInputProps) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  React.useEffect(() => { ref.current?.focus(); }, []);

  const confirm = () => {
    const trimmed = value.trim();
    if (trimmed) onConfirm(trimmed);
    else onCancel();
  };

  return (
    <div className="flex items-center gap-2 py-1 pr-2" style={{ paddingLeft: `${indent}px` }}>
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter") confirm();
          if (e.key === "Escape") onCancel();
        }}
        onBlur={confirm}
        className="
          flex-1 bg-zinc-800 border border-amber-500/60 rounded px-2 py-0.5
          text-sm text-zinc-100 placeholder-zinc-500 outline-none
          focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30
        "
      />
    </div>
  );
}

// ─── TreeNode ──────────────────────────────────────────────────────────────────

interface TreeNodeProps {
  node: FileSystemNode;
  depth: number;
  onContextMenu?: (e: React.MouseEvent, node: FileSystemNode) => void;
  onCreateChild: (parentId: string | null, kind: "file" | "folder") => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  /** For inline‑creation state tracking */
  creatingHere?: { kind: "file" | "folder" } | null;
  setCreatingHere?: (v: { kind: "file" | "folder" } | null) => void;
}

function TreeNode({
  node,
  depth,
  onContextMenu,
  onCreateChild,
  onDelete,
  onRename,
  creatingHere,
  setCreatingHere,
}: TreeNodeProps) {
  const { expandedIds, toggleExpand, selectedFileId, selectFile } = useExplorerStore();
  const isExpanded = expandedIds.has(node.id);
  const isActive = selectedFileId === node.id;
  const indent = 12 + depth * 16;

  // ── Folder ────────────────────────────────────────────────────────────────
  if (node.type === "folder") {
    const { Icon, color } = getFolderIcon(node.name, isExpanded);
    return (
      <div>
        <button
          onContextMenu={(e) => onContextMenu?.(e, node)}
          onClick={() => toggleExpand(node.id)}
          className={`
            flex items-center gap-2 w-full py-1 text-sm font-medium text-zinc-300
            hover:bg-zinc-800/50 hover:text-zinc-100 rounded-md transition-colors group
          `}
          style={{ paddingLeft: `${indent}px`, paddingRight: "8px" }}
        >
          {isExpanded
            ? <ChevronDown size={14} className="shrink-0 text-zinc-500" />
            : <ChevronRight size={14} className="shrink-0 text-zinc-500" />
          }
          <Icon size={15} className={`shrink-0 ${color}`} />
          <span className="truncate">{node.name}</span>
        </button>

        {isExpanded && node.children && (
          <div>
            {/* Indentation guide line */}
            <div className="relative">
              <div
                className="absolute left-0 top-0 bottom-0 w-px bg-zinc-700/20"
                style={{ left: `${indent + 1}px` }}
              />
              {node.children.map((child) => (
                <TreeNode
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  onContextMenu={onContextMenu}
                  onCreateChild={onCreateChild}
                  onDelete={onDelete}
                  onRename={onRename}
                  creatingHere={creatingHere}
                  setCreatingHere={setCreatingHere}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── File ────────────────────────────────────────────────────────────────────
  const { Icon, color } = getFileIcon(node.name);
  return (
    <div className="relative">
      {/* Indentation guide */}
      <div
        className="absolute left-0 top-0 w-px bg-zinc-700/20"
        style={{ left: `${indent + 1}px`, height: "100%" }}
      />
      <button
        onContextMenu={(e) => onContextMenu?.(e, node)}
        onClick={() => selectFile(node.id)}
        title={node.name}
        className={`
          flex items-center gap-2 w-full py-1 text-sm rounded-md transition-all truncate
          ${isActive
            ? "bg-amber-500/15 text-amber-300 border-l-2 border-amber-500"
            : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40"
          }
        `}
        style={{ paddingLeft: `${indent + (isActive ? 0 : 2)}px`, paddingRight: "8px" }}
      >
        <Icon size={15} className={`shrink-0 ${color}`} />
        <span className="truncate">{node.name}</span>
      </button>
    </div>
  );
}

// ─── ExplorerSidebar ──────────────────────────────────────────────────────────

export default function ExplorerSidebar() {
  const {
    tree,
    rootName,
    hasFolder,
    addNode,
    removeNode,
    renameNode,
    clearTree,
  } = useExplorerStore();

  // Track which node is currently being created (inline input)
  const [creating, setCreating] = useState<{
    parentId: string | null;
    kind: "file" | "folder";
  } | null>(null);

  // Track which node is being renamed (starting from context menu)
  const [renaming, setRenaming] = useState<{ id: string; currentName: string } | null>(null);

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    node: FileSystemNode;
  } | null>(null);
  const ctxMenuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileSystemNode) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const handleCreate = useCallback(
    (parentId: string | null, kind: "file" | "folder") => {
      setCtxMenu(null);
      setCreating({ parentId, kind });
    },
    [],
  );

  const handleCreateConfirm = useCallback(
    (name: string) => {
      if (!creating) return;
      const newNode: FileSystemNode = {
        id: creating.parentId ? `${creating.parentId}/${name}` : name,
        name,
        type: creating.kind,
        ...(creating.kind === "folder" ? { children: [] } : { content: "" }),
      };
      addNode(creating.parentId, newNode);
      setCreating(null);
    },
    [creating, addNode],
  );

  const handleDelete = useCallback(
    (id: string) => {
      setCtxMenu(null);
      const confirmed = window.confirm("Delete this entry?");
      if (confirmed) removeNode(id);
    },
    [removeNode],
  );

  const handleRename = useCallback(
    (id: string, newName: string) => {
      renameNode(id, newName);
      setRenaming(null);
    },
    [renameNode],
  );

  return (
    <aside className="w-56 h-full bg-zinc-900/80 border-r border-zinc-800/50 flex flex-col overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center justify-between shrink-0">
        <h2 className="text-xs uppercase tracking-widest text-zinc-400 font-bold">
          Explorer
        </h2>

        <div className="flex items-center gap-1 ml-auto">
          {hasFolder && (
            <>
              <button
                title="New File"
                onClick={() => handleCreate(null, "file")}
                className="p-1.5 hover:bg-zinc-800/60 rounded text-zinc-500 hover:text-zinc-300"
              >
                <FilePlus size={15} />
              </button>
              <button
                title="New Folder"
                onClick={() => handleCreate(null, "folder")}
                className="p-1.5 hover:bg-zinc-800/60 rounded text-zinc-500 hover:text-zinc-300"
              >
                <FolderPlus size={15} />
              </button>
            </>
          )}
          {/* AI Context button */}
          <button
            title="Compile workspace context"
            onClick={() => {
              const ctx = compileWorkspaceContext(tree, rootName ?? "root");
              navigator.clipboard.writeText(ctx);
            }}
            className="p-1.5 hover:bg-amber-500/20 rounded text-amber-500 hover:text-amber-400"
          >
            <Code2 size={15} />
          </button>
          <button
            title="Close sidebar"
            className="p-1.5 hover:bg-zinc-800/60 rounded text-zinc-500 hover:text-zinc-300"
            onClick={() => document.dispatchEvent(new CustomEvent("toggle-sidebar"))}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Tree area */}
      <div className="flex-1 overflow-y-auto py-1 px-1.5 space-y-px">
        {!hasFolder ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-12 px-4 text-center">
            <div className="p-4 bg-zinc-800/40 rounded-xl">
              <Folder size={32} className="text-amber-500/70" />
            </div>
            <p className="text-sm text-zinc-300 font-semibold mb-1">No folder open</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Open a folder to start browsing and editing files.
            </p>
          </div>
        ) : (
          <>
            {/* Root row */}
            <button
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm font-bold text-zinc-100 hover:bg-zinc-800/50 rounded-md"
              onClick={() => {}}
            >
              <ChevronDown size={14} className="shrink-0 text-zinc-500" />
              <FolderOpen size={15} className="shrink-0 text-amber-400" />
              <span className="truncate uppercase tracking-wide text-xs">{rootName}</span>
            </button>

            {/* Inline creation at root */}
            {creating?.parentId === null && (
              <InlineInput
                placeholder={creating.kind === "file" ? "filename.ts" : "folder-name"}
                onConfirm={handleCreateConfirm}
                onCancel={() => setCreating(null)}
                indent={36}
              />
            )}

            {/* Tree nodes */}
            {tree.map((node: FileSystemNode) => (
              <TreeNode
                key={node.id}
                node={node}
                depth={0}
                onContextMenu={handleContextMenu}
                onCreateChild={handleCreate}
                onDelete={handleDelete}
                onRename={handleRename}
              />
            ))}

            {tree.length === 0 && (
              <p className="text-xs text-zinc-600 italic px-6 py-2">Folder is empty</p>
            )}
          </>
        )}
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div
          ref={ctxMenuRef}
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          className="fixed z-[999] min-w-[180px] bg-zinc-800 border border-zinc-700/60 rounded-lg shadow-2xl py-1 text-sm overflow-hidden"
        >
          {ctxMenu.node.type === "folder" && (
            <>
              <button
                className="w-full flex items-center gap-3 px-3 py-2 text-zinc-300 hover:bg-zinc-700/60 hover:text-zinc-100"
                onClick={() => handleCreate(ctxMenu.node.id, "file")}
              >
                <FilePlus size={14} className="text-zinc-400" />
                New File
              </button>
              <button
                className="w-full flex items-center gap-3 px-3 py-2 text-zinc-300 hover:bg-zinc-700/60 hover:text-zinc-100"
                onClick={() => handleCreate(ctxMenu.node.id, "folder")}
              >
                <FolderPlus size={14} className="text-zinc-400" />
                New Folder
              </button>
              <div className="border-t border-zinc-700/50 my-1" />
            </>
          )}
          <button
            className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            onClick={() => handleDelete(ctxMenu.node.id)}
          >
            <Trash2 size={14} />
            Delete
          </button>
          <div className="border-t border-zinc-700/50 my-1" />
          <button
            className="w-full flex items-center gap-3 px-3 py-2 text-zinc-500 hover:bg-zinc-700/60 text-xs"
            onClick={() => setCtxMenu(null)}
          >
            Cancel
          </button>
        </div>
      )}
    </aside>
  );
}