"use client";

/**
 * SideBar — real file tree driven by FileSystemContext.
 *
 * Features:
 *   - Open Folder button (calls File System Access API)
 *   - Expandable/collapsible tree nodes
 *   - File-type icons with colors
 *   - Right-click context menu: New File, New Folder, Delete
 *   - Inline name input for creating new files/folders
 *   - Active file highlight synced to editor
 */

import React, { useCallback, useRef, useState } from "react";
import { useFileSystem } from "@/context/FileSystemContext";
import type { FileNode } from "@/lib/fs/types";
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
  ChevronLeft,
  Zap,
  Loader2,
} from "lucide-react";

// ─── Icon helpers ──────────────────────────────────────────────────────────────

function getFileIcon(name: string): { Icon: React.ComponentType<{ size?: number; className?: string }>; color: string } {
  const ext = name.split(".").pop()?.toLowerCase();
  if (name.startsWith(".git")) return { Icon: GitBranch, color: "text-red-400" };
  if (name === "package.json" || name === "package-lock.json") return { Icon: Package, color: "text-green-400" };
  if (ext === "tsx" || ext === "jsx") return { Icon: Code2, color: "text-blue-400" };
  if (ext === "ts") return { Icon: Code2, color: "text-blue-300" };
  if (ext === "js" || ext === "mjs" || ext === "cjs") return { Icon: FileCode2, color: "text-yellow-400" };
  if (ext === "css" || ext === "scss" || ext === "less") return { Icon: Palette, color: "text-purple-400" };
  if (ext === "md" || ext === "mdx") return { Icon: FileText, color: "text-orange-400" };
  if (ext === "json" || ext === "jsonc") return { Icon: FileJson, color: "text-amber-300" };
  if (ext === "html" || ext === "svg") return { Icon: Globe, color: "text-blue-300" };
  if (ext === "env" || name.startsWith(".")) return { Icon: Settings, color: "text-red-300" };
  return { Icon: File, color: "text-zinc-400" };
}

function getFolderIcon(name: string, open: boolean): { Icon: React.ComponentType<{ size?: number; className?: string }>; color: string } {
  if (name === "node_modules") return { Icon: Package, color: "text-green-400" };
  if (name === ".next") return { Icon: Zap, color: "text-yellow-400" };
  if (name === ".git") return { Icon: GitBranch, color: "text-red-400" };
  if (name === "public") return { Icon: Globe, color: "text-blue-300" };
  const Icon = open ? FolderOpen : Folder;
  return { Icon, color: "text-amber-400" };
}

// ─── Inline name input (new file / folder) ─────────────────────────────────────

interface InlineInputProps {
  placeholder: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  indent: number;
}

function InlineInput({ placeholder, onConfirm, onCancel, indent }: InlineInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const confirm = () => {
    const trimmed = value.trim();
    if (trimmed) onConfirm(trimmed);
    else onCancel();
  };

  return (
    <div
      className="flex items-center gap-2 py-1 pr-2"
      style={{ paddingLeft: `${indent}px` }}
    >
      <input
        ref={inputRef}
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

// ─── Context menu ──────────────────────────────────────────────────────────────

interface ContextMenuState {
  x: number;
  y: number;
  node: FileNode;
}

// ─── TreeNode ──────────────────────────────────────────────────────────────────

interface TreeNodeProps {
  node: FileNode;
  level: number;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
}

function TreeNode({ node, level, onContextMenu }: TreeNodeProps) {
  const { expandedIds, toggleExpanded, activeTabId, openTab } = useFileSystem();
  const isExpanded = expandedIds.has(node.id);
  const isActive = activeTabId === node.id;
  const indent = 12 + level * 16;

  if (node.kind === "directory") {
    const { Icon, color } = getFolderIcon(node.name, isExpanded);
    return (
      <div>
        <button
          onContextMenu={(e) => onContextMenu(e, node)}
          onClick={() => toggleExpanded(node.id)}
          className="
            flex items-center gap-2 w-full py-1 text-sm font-medium text-zinc-300
            hover:bg-zinc-800/50 hover:text-zinc-100 rounded-md transition-colors group
          "
          style={{ paddingLeft: `${indent}px`, paddingRight: "8px" }}
        >
          {isExpanded
            ? <ChevronDown size={14} className="shrink-0 text-zinc-500 group-hover:text-zinc-400 transition-transform" />
            : <ChevronRight size={14} className="shrink-0 text-zinc-500 group-hover:text-zinc-400" />
          }
          <Icon size={15} className={`shrink-0 ${color}`} />
          <span className="truncate">{node.name}</span>
        </button>

        {isExpanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                level={level + 1}
                onContextMenu={onContextMenu}
              />
            ))}
            {node.children.length === 0 && (
              <p
                className="text-xs text-zinc-600 italic py-1"
                style={{ paddingLeft: `${indent + 32}px` }}
              >
                empty
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // File node
  const { Icon, color } = getFileIcon(node.name);
  return (
    <button
      onContextMenu={(e) => onContextMenu(e, node)}
      onClick={() => openTab(node)}
      title={node.name}
      className={`
        flex items-center gap-2 w-full py-1 text-sm rounded-md transition-all truncate
        ${isActive
          ? "bg-amber-500/15 text-amber-300 border-l-2 border-amber-500"
          : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40"
        }
      `}
      style={{
        paddingLeft: `${indent + (isActive ? 0 : 2)}px`,
        paddingRight: "8px",
      }}
    >
      <Icon size={15} className={`shrink-0 ${color}`} />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

type SidebarProps = {
  activeTab?: string;
  onOpenFile?: ((fileName: string) => void) | null;
};

export default function Sidebar({ activeTab = "explorer" }: SidebarProps) {
  const {
    tree,
    rootName,
    hasFolder,
    isLoading,
    openFolder,
    openFolderFromPath,
    createFile,
    createDirectory,
    deleteEntry,
    expandedIds,
    toggleExpanded,
  } = useFileSystem();

  // #region agent log
  React.useEffect(() => {
    fetch('http://127.0.0.1:7704/ingest/21c90beb-a2ba-444e-bd6c-01a44fb90e45',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f9af86'},body:JSON.stringify({sessionId:'f9af86',location:'SideBar.tsx:state',message:'SideBar FS state',data:{hasFolder,isLoading,rootName,treeLength:tree.length},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
  }, [hasFolder, isLoading, rootName, tree.length]);
  // #endregion

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const ctxMenuRef = useRef<HTMLDivElement>(null);

  // Path input state (backend mode)
  const [showPathInput, setShowPathInput] = useState(false);
  const [pathInputValue, setPathInputValue] = useState("");
  const pathInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (showPathInput) {
      pathInputRef.current?.focus();
    }
  }, [showPathInput]);

  const handlePathSubmit = () => {
    const trimmed = pathInputValue.trim();
    if (trimmed) {
      openFolderFromPath(trimmed);
      setShowPathInput(false);
      setPathInputValue("");
    }
  };

  // Inline creation state
  const [creating, setCreating] = useState<{
    parentNode: FileNode | null;
    kind: "file" | "directory";
    parentLevel: number;
  } | null>(null);

  // Close context menu on outside click
  React.useEffect(() => {
    if (!ctxMenu) return;
    const handler = (e: MouseEvent) => {
      if (ctxMenuRef.current && !ctxMenuRef.current.contains(e.target as Node)) {
        setCtxMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ctxMenu]);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const handleNewFile = useCallback(
    (parentNode: FileNode | null, level: number) => {
      setCtxMenu(null);
      setCreating({ parentNode, kind: "file", parentLevel: level });
    },
    [],
  );

  const handleNewFolder = useCallback(
    (parentNode: FileNode | null, level: number) => {
      setCtxMenu(null);
      setCreating({ parentNode, kind: "directory", parentLevel: level });
    },
    [],
  );

  const handleDelete = useCallback(
    async (node: FileNode) => {
      setCtxMenu(null);
      const confirmed = window.confirm(
        `Delete "${node.name}"? This cannot be undone.`,
      );
      if (confirmed) await deleteEntry(node);
    },
    [deleteEntry],
  );

  const handleCreateConfirm = useCallback(
    async (name: string) => {
      if (!creating) return;
      if (creating.kind === "file") {
        await createFile(creating.parentNode, name);
      } else {
        await createDirectory(creating.parentNode, name);
      }
      setCreating(null);
    },
    [creating, createFile, createDirectory],
  );

  return (
    <aside className="w-56 h-full bg-zinc-900/80 border-r border-zinc-800/50 flex flex-col overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center justify-between shrink-0">
        <h2 className="text-xs uppercase tracking-widest text-zinc-400 font-bold">
          {activeTab === "explorer" && "Explorer"}
          {activeTab === "search" && "Search"}
          {activeTab === "source" && "Source Control"}
          {activeTab === "run" && "Run & Debug"}
          {activeTab === "extensions" && "Extensions"}
        </h2>

        <div className="flex items-center gap-1 ml-auto">
          {hasFolder && (
            <>
              <button
                title="New File"
                onClick={() => handleNewFile(null, 1)}
                className="p-1.5 hover:bg-zinc-800/60 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <FilePlus size={15} />
              </button>
              <button
                title="New Folder"
                onClick={() => handleNewFolder(null, 1)}
                className="p-1.5 hover:bg-zinc-800/60 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <FolderPlus size={15} />
              </button>
            </>
          )}
          <button
            title="Close sidebar"
            className="p-1.5 hover:bg-zinc-800/60 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
            onClick={() => document.dispatchEvent(new CustomEvent("toggle-sidebar"))}
          >
            <ChevronLeft size={15} />
          </button>
        </div>
      </div>

      {/* Tree area */}
      <div className="flex-1 overflow-y-auto py-1 px-1.5 space-y-px">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-zinc-500">
            <Loader2 size={22} className="animate-spin text-amber-500" />
            <p className="text-xs">Loading folder…</p>
          </div>
        ) : !hasFolder ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full gap-4 py-12 px-4 text-center">
            <div className="p-4 bg-zinc-800/40 rounded-xl">
              <FolderInput size={32} className="text-amber-500/70" />
            </div>
            <div>
              <p className="text-sm text-zinc-300 font-semibold mb-1">No folder open</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Open a folder to start browsing and editing files.
              </p>
            </div>
            <button
              onClick={openFolder}
              className="
                mt-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold
                rounded-lg transition-all duration-200 shadow-md hover:shadow-amber-500/20
                active:scale-[0.97]
              "
            >
              Open Folder
            </button>

            {showPathInput ? (
              <div className="mt-3 w-full">
                <input
                  ref={pathInputRef}
                  value={pathInputValue}
                  onChange={(e) => setPathInputValue(e.target.value)}
                  placeholder="/absolute/path/to/folder"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handlePathSubmit();
                    if (e.key === "Escape") {
                      setShowPathInput(false);
                      setPathInputValue("");
                    }
                  }}
                  onBlur={() => {
                    if (!pathInputValue.trim()) {
                      setShowPathInput(false);
                    }
                  }}
                  className="
                    w-full bg-zinc-800 border border-amber-500/40 rounded-lg px-3 py-2
                    text-sm text-zinc-100 placeholder-zinc-500 outline-none
                    focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30
                  "
                />
                <p className="text-[10px] text-zinc-600 mt-1.5 text-left">
                  Enter ↵ to confirm &middot; Esc to cancel
                </p>
              </div>
            ) : (
              <button
                onClick={() => setShowPathInput(true)}
                className="
                  mt-2 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300
                  border border-zinc-800 hover:border-zinc-700 rounded-lg
                  transition-all duration-150
                "
              >
                Open from path
              </button>
            )}
          </div>
        ) : (
          /* Root tree */
          <>
            {/* Path input for backend mode when folder is open */}
            {showPathInput && (
              <div className="px-3 py-2 border-b border-zinc-800/50 mb-1">
                <input
                  ref={pathInputRef}
                  value={pathInputValue}
                  onChange={(e) => setPathInputValue(e.target.value)}
                  placeholder="/absolute/path/to/folder"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handlePathSubmit();
                    if (e.key === "Escape") {
                      setShowPathInput(false);
                      setPathInputValue("");
                    }
                  }}
                  onBlur={() => {
                    if (!pathInputValue.trim()) {
                      setShowPathInput(false);
                    }
                  }}
                  className="
                    w-full bg-zinc-800 border border-amber-500/40 rounded-lg px-3 py-2
                    text-sm text-zinc-100 placeholder-zinc-500 outline-none
                    focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30
                  "
                />
                <p className="text-[10px] text-zinc-600 mt-1">
                  Enter ↵ to open &middot; Esc to cancel
                </p>
              </div>
            )}

            {/* Root folder row */}
            <button
              onClick={() => toggleExpanded("__root__")}
              className="
                flex items-center gap-2 w-full px-3 py-1.5 text-sm font-bold text-zinc-100
                hover:bg-zinc-800/50 rounded-md transition-colors group
              "
            >
              <ChevronDown
                size={14}
                className={`shrink-0 text-zinc-500 transition-transform ${expandedIds.has("__root__") || !expandedIds.has("__root__") ? "" : "-rotate-90"}`}
              />
              <Folder size={15} className="shrink-0 text-amber-400" />
              <span className="truncate uppercase tracking-wide text-xs">
                {rootName}
              </span>
            </button>

            {/* Inline input at root level */}
            {creating && creating.parentNode === null && (
              <InlineInput
                placeholder={creating.kind === "file" ? "filename.ts" : "folder-name"}
                onConfirm={handleCreateConfirm}
                onCancel={() => setCreating(null)}
                indent={36}
              />
            )}

            {/* Tree nodes */}
            {tree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                level={1}
                onContextMenu={handleContextMenu}
              />
            ))}

            {tree.length === 0 && (
              <p className="text-xs text-zinc-600 italic px-6 py-2">
                Folder is empty
              </p>
            )}
          </>
        )}
      </div>

      {/* Footer buttons */}
      {hasFolder && (
        <div className="border-t border-zinc-800/50 p-3 flex gap-2 flex-wrap">
          <button
            onClick={() => handleNewFile(null, 1)}
            title="New File"
            className="
              flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold
              bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100
              rounded-lg transition-all duration-150 border border-zinc-700/50
            "
          >
            <FilePlus size={14} />
            File
          </button>
          <button
            onClick={() => handleNewFolder(null, 1)}
            title="New Folder"
            className="
              flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold
              bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100
              rounded-lg transition-all duration-150 border border-zinc-700/50
            "
          >
            <FolderPlus size={14} />
            Folder
          </button>
          <button
            onClick={openFolder}
            title="Open different folder (File System API)"
            className="
              p-2 flex items-center justify-center
              bg-amber-600/80 hover:bg-amber-500 text-white
              rounded-lg transition-all duration-150
            "
          >
            <FolderInput size={14} />
          </button>
          <button
            onClick={() => setShowPathInput(true)}
            title="Open folder from path"
            className="
              p-2 flex items-center justify-center
              bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200
              rounded-lg transition-all duration-150 border border-zinc-700/50
            "
          >
            <FolderInput size={14} />
          </button>
        </div>
      )}

      {/* Context Menu */}
      {ctxMenu && (
        <div
          ref={ctxMenuRef}
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          className="
            fixed z-[999] min-w-[180px] bg-zinc-800 border border-zinc-700/60
            rounded-lg shadow-2xl py-1 text-sm overflow-hidden
          "
        >
          {ctxMenu.node.kind === "directory" && (
            <>
              <button
                className="w-full flex items-center gap-3 px-3 py-2 text-zinc-300 hover:bg-zinc-700/60 hover:text-zinc-100 transition-colors"
                onClick={() => handleNewFile(ctxMenu.node, 2)}
              >
                <FilePlus size={14} className="text-zinc-400" />
                New File
              </button>
              <button
                className="w-full flex items-center gap-3 px-3 py-2 text-zinc-300 hover:bg-zinc-700/60 hover:text-zinc-100 transition-colors"
                onClick={() => handleNewFolder(ctxMenu.node, 2)}
              >
                <FolderPlus size={14} className="text-zinc-400" />
                New Folder
              </button>
              <div className="border-t border-zinc-700/50 my-1" />
            </>
          )}
          <button
            className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            onClick={() => handleDelete(ctxMenu.node)}
          >
            <Trash2 size={14} />
            Delete
          </button>
          {/* Close option */}
          <div className="border-t border-zinc-700/50 my-1" />
          <button
            className="w-full flex items-center gap-3 px-3 py-2 text-zinc-500 hover:bg-zinc-700/60 text-xs transition-colors"
            onClick={() => setCtxMenu(null)}
          >
            Cancel
          </button>
        </div>
      )}
    </aside>
  );
}