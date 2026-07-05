"use client";

/**
 * FileSystemContext
 *
 * Single source of truth for all filesystem state in the IDE.
 * Supports two modes:
 *   "native"  → browser File System Access API (Chromium only)
 *   "backend" → Node.js backend via /api/fs and /api/file (all browsers)
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useExplorerStore } from "@/lib/fs/explorer-store";
import { NativeFSProvider, isNativeFSSupported } from "@/lib/fs/nativeProvider";
import { BackendFSProvider } from "@/lib/fs/backendProvider";
import { AutoSaveManager } from "@/lib/fs/autoSave";
import { detectLanguage, type EditorTab, type FileNode, type SaveStatus } from "@/lib/fs/types";
import type { FileSystemNode } from "@/lib/fs/explorer-types";

type FSProvider = "native" | "backend";

// ─── Context shape ────────────────────────────────────────────────────────────

export interface FileSystemContextValue {
  tree: FileNode[];
  rootName: string | null;
  hasFolder: boolean;
  isLoading: boolean;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;

  openFolder: () => Promise<void>;
  openFolderFromPath: (path: string) => Promise<void>;
  closeFolder: () => void;
  createFile: (parentNode: FileNode | null, name: string) => Promise<void>;
  createDirectory: (parentNode: FileNode | null, name: string) => Promise<void>;
  deleteEntry: (node: FileNode) => Promise<void>;

  tabs: EditorTab[];
  activeTabId: string | null;
  openTab: (node: FileNode) => Promise<void>;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;

  handleContentChange: (tabId: string, newContent: string) => void;
  saveActiveTab: () => Promise<void>;
  saveStatus: Record<string, SaveStatus>;

  isNativeFSSupported: boolean;
  provider: FSProvider;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Recursively maps FileNode[] children to FileSystemNode[] for the Zustand store */
function mapChildren(children?: FileNode[]): FileSystemNode[] | undefined {
  if (!children) return undefined;
  return children.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.kind === "directory" ? "folder" : "file",
    children: c.kind === "directory" ? mapChildren(c.children) : [],
  }));
}

interface BackendTreeChild {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: BackendTreeChild[];
}

function backendNodeToFileNode(
  node: BackendTreeChild,
  wsRoot: string,
  parentId: string,
): FileNode {
  const id = parentId ? `${parentId}/${node.name}` : node.name;
  if (node.isDirectory) {
    return {
      id,
      name: node.name,
      kind: "directory",
      backendPath: node.path,
      workspaceRoot: wsRoot,
      children: (node.children ?? []).map((c) =>
        backendNodeToFileNode(c, wsRoot, id),
      ),
    };
  }
  return {
    id,
    name: node.name,
    kind: "file",
    backendPath: node.path,
    workspaceRoot: wsRoot,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const FileSystemContext = createContext<FileSystemContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function FileSystemProvider({ children }: { children: React.ReactNode }) {
  // Use Zustand store for tree state
  const {
    tree: explorerTree,
    rootName: explorerRootName,
    hasFolder,
    setTree: setExplorerTree,
    clearTree,
    addNode,
    removeNode,
    renameNode,
  } = useExplorerStore();

  // Legacy local state (kept for backward-compat in the context value)
  const [tree, setTree] = useState<FileNode[]>([]);
  const [rootName, setRootName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Tabs state
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Save status per tab id
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});

  // Provider mode
  const [provider, setProvider] = useState<FSProvider>("native");

  // Native-mode: root directory handle
  const rootHandleRef = useRef<FileSystemDirectoryHandle | null>(null);

  // Backend-mode: root path
  const [rootPath, setRootPath] = useState<string | null>(null);

  // Auto-save manager (singleton, stable across renders)
  const autoSave = useMemo(() => new AutoSaveManager(800), []);

  // ── clear state helper ────────────────────────────────────────────────────

  const clearFolderState = useCallback(() => {
    setTree([]);
    setRootName(null);
    setRootPath(null);
    setTabs([]);
    setActiveTabId(null);
    setSaveStatus({});
    setExpandedIds(new Set());
    rootHandleRef.current = null;
    // Also clear Zustand explorer
    clearTree();
  }, [clearTree]);

  // ── open via native FS API ────────────────────────────────────────────────

  const openFolder = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7704/ingest/21c90beb-a2ba-444e-bd6c-01a44fb90e45',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f9af86'},body:JSON.stringify({sessionId:'f9af86',location:'FileSystemContext.tsx:openFolder:entry',message:'openFolder called',data:{nativeSupported:isNativeFSSupported()},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    if (!isNativeFSSupported()) {
      alert(
        "Your browser does not support the File System Access API.\n" +
          "Please use Chrome or Edge, or use Open from Path below.",
      );
      return;
    }

    try {
      const dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      // #region agent log
      fetch('http://127.0.0.1:7704/ingest/21c90beb-a2ba-444e-bd6c-01a44fb90e45',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f9af86'},body:JSON.stringify({sessionId:'f9af86',location:'FileSystemContext.tsx:openFolder:pickerDone',message:'picker returned handle',data:{dirName:dirHandle.name,kind:dirHandle.kind},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      setIsLoading(true);

      rootHandleRef.current = dirHandle;
      setRootName(dirHandle.name);
      setProvider("native");

      const nodes = await NativeFSProvider.buildTree(dirHandle, dirHandle.name);
      // #region agent log
      fetch('http://127.0.0.1:7704/ingest/21c90beb-a2ba-444e-bd6c-01a44fb90e45',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f9af86'},body:JSON.stringify({sessionId:'f9af86',location:'FileSystemContext.tsx:openFolder:treeBuilt',message:'buildTree completed',data:{nodeCount:nodes.length,rootName:dirHandle.name},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      setTree(nodes);
      // Also sync into Zustand explorer store
      setExplorerTree(
        nodes.map((n) => ({
          id: n.id,
          name: n.name,
          type: n.kind === "directory" ? "folder" : "file",
          children: n.kind === "directory" ? mapChildren(n.children) : [],
        })),
        dirHandle.name,
      );

      const firstLevelIds = new Set(nodes.map((n) => n.id));
      setExpandedIds(firstLevelIds);

      setTabs([]);
      setActiveTabId(null);
      setSaveStatus({});
      // #region agent log
      fetch('http://127.0.0.1:7704/ingest/21c90beb-a2ba-444e-bd6c-01a44fb90e45',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f9af86'},body:JSON.stringify({sessionId:'f9af86',location:'FileSystemContext.tsx:openFolder:stateSet',message:'all state updates dispatched',data:{nodeCount:nodes.length,rootName:dirHandle.name,hasFolder:true},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      // #region agent log
      fetch('http://127.0.0.1:7704/ingest/21c90beb-a2ba-444e-bd6c-01a44fb90e45',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f9af86'},body:JSON.stringify({sessionId:'f9af86',location:'FileSystemContext.tsx:openFolder:error',message:'openFolder failed',data:{errName:err instanceof Error?err.name:'unknown',errMsg:err instanceof Error?err.message:String(err)},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      console.error("[FileSystem] openFolder error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── open via backend API ─────────────────────────────────────────────────

  const openFolderFromPath = useCallback(async (path: string) => {
    if (!path.trim()) return;
    setIsLoading(true);
    try {
      const { tree: rawTree } = await BackendFSProvider.readDir(path.trim());
      setRootPath(path.trim());
      setRootName(rawTree.name);
      setProvider("backend");

      const nodes = (rawTree.children ?? []).map((c) =>
        backendNodeToFileNode(c, path.trim(), ""),
      );
      setTree(nodes);

      const firstLevelIds = new Set(nodes.map((n) => n.id));
      setExpandedIds(firstLevelIds);

      setTabs([]);
      setActiveTabId(null);
      setSaveStatus({});
    } catch (err) {
      console.error("[FileSystem] openFolderFromPath error:", err);
      alert(`Failed to open folder: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── close folder ─────────────────────────────────────────────────────────

  const closeFolder = useCallback(() => {
    clearFolderState();
  }, [clearFolderState]);

  // ── Tree toggle ──────────────────────────────────────────────────────────

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // ── Tab operations ───────────────────────────────────────────────────────

  const openTab = useCallback(
    async (node: FileNode) => {
      if (tabs.some((t) => t.id === node.id)) {
        setActiveTabId(node.id);
        return;
      }

      if (provider === "backend") {
        if (!node.backendPath || !node.workspaceRoot) return;
        try {
          const content = await BackendFSProvider.readFile(
            node.backendPath,
            node.workspaceRoot,
          );
          const language = detectLanguage(node.name);
          const newTab: EditorTab = {
            id: node.id,
            name: node.name,
            language,
            content,
            savedContent: content,
            isDirty: false,
            backendPath: node.backendPath,
            workspaceRoot: node.workspaceRoot,
          };
          setTabs((prev) => {
            if (prev.some((t) => t.id === node.id)) {
              setActiveTabId(node.id);
              return prev;
            }
            setActiveTabId(node.id);
            return [...prev, newTab];
          });
          setSaveStatus((prev) => ({ ...prev, [node.id]: "idle" }));
        } catch (err) {
          console.error("[FileSystem] openTab backend error:", err);
        }
      } else {
        // native mode
        if (node.kind !== "file" || !node.handle) return;
        const handle = node.handle as FileSystemFileHandle;
        try {
          const content = await NativeFSProvider.readFile(handle);
          const language = detectLanguage(node.name);
          const newTab: EditorTab = {
            id: node.id,
            name: node.name,
            language,
            content,
            savedContent: content,
            isDirty: false,
            handle,
          };
          setTabs((prev) => {
            if (prev.some((t) => t.id === node.id)) {
              setActiveTabId(node.id);
              return prev;
            }
            setActiveTabId(node.id);
            return [...prev, newTab];
          });
          setSaveStatus((prev) => ({ ...prev, [node.id]: "idle" }));
        } catch (err) {
          console.error("[FileSystem] openTab native error:", err);
        }
      }
    },
    [tabs, provider],
  );

  const closeTab = useCallback(
    (tabId: string) => {
      autoSave.cancel(tabId);
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === tabId);
        const next = prev.filter((t) => t.id !== tabId);
        setActiveTabId((currentActive) => {
          if (currentActive !== tabId) return currentActive;
          if (next.length === 0) return null;
          return next[Math.max(0, idx - 1)]?.id ?? next[0]?.id ?? null;
        });
        return next;
      });
      setSaveStatus((prev) => {
        const next = { ...prev };
        delete next[tabId];
        return next;
      });
    },
    [autoSave],
  );

  // ── Content change + auto-save ──────────────────────────────────────────

  const handleContentChange = useCallback(
    (tabId: string, newContent: string) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId
            ? { ...t, content: newContent, isDirty: newContent !== t.savedContent }
            : t,
        ),
      );

      setTabs((prev) => {
        const tab = prev.find((t) => t.id === tabId);
        if (!tab) return prev;

        let saveFn: (() => Promise<void>) | null = null;

        if (provider === "backend" && tab.backendPath && tab.workspaceRoot) {
          const bp = tab.backendPath;
          const wr = tab.workspaceRoot;
          saveFn = () => BackendFSProvider.writeFile(bp, wr, newContent);
        } else if (provider === "native" && tab.handle) {
          const handle = tab.handle;
          saveFn = () => NativeFSProvider.writeFile(handle, newContent);
        }

        if (!saveFn) return prev;

        autoSave.schedule(
          tabId,
          saveFn,
          () => setSaveStatus((s) => ({ ...s, [tabId]: "saving" })),
          () => {
            setSaveStatus((s) => ({ ...s, [tabId]: "saved" }));
            setTabs((p) =>
              p.map((t) =>
                t.id === tabId
                  ? { ...t, savedContent: newContent, isDirty: false }
                  : t,
              ),
            );
            setTimeout(
              () => setSaveStatus((s) => ({ ...s, [tabId]: "idle" })),
              1500,
            );
          },
          (err) => {
            console.error("[AutoSave] write failed:", err);
            setSaveStatus((s) => ({ ...s, [tabId]: "error" }));
          },
        );

        return prev;
      });
    },
    [autoSave, provider],
  );

  // ── Manual save ─────────────────────────────────────────────────────────

  const saveActiveTab = useCallback(async () => {
    if (!activeTabId) return;
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab) return;

    autoSave.cancel(activeTabId);
    setSaveStatus((s) => ({ ...s, [activeTabId]: "saving" }));

    try {
      if (provider === "backend" && tab.backendPath && tab.workspaceRoot) {
        await BackendFSProvider.writeFile(tab.backendPath, tab.workspaceRoot, tab.content);
      } else if (provider === "native" && tab.handle) {
        await NativeFSProvider.writeFile(tab.handle, tab.content);
      } else {
        return;
      }

      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, savedContent: tab.content, isDirty: false }
            : t,
        ),
      );
      setSaveStatus((s) => ({ ...s, [activeTabId]: "saved" }));
      setTimeout(() => setSaveStatus((s) => ({ ...s, [activeTabId]: "idle" })), 1500);
    } catch (err) {
      console.error("[FileSystem] save error:", err);
      setSaveStatus((s) => ({ ...s, [activeTabId]: "error" }));
    }
  }, [activeTabId, tabs, autoSave, provider]);

  // ── File/dir creation ───────────────────────────────────────────────────

  const resolveDirectoryHandle = useCallback(
    async (node: FileNode | null): Promise<FileSystemDirectoryHandle | null> => {
      if (!rootHandleRef.current) return null;
      if (!node) return rootHandleRef.current;
      if (node.kind === "directory" && node.handle) {
        return node.handle as FileSystemDirectoryHandle;
      }
      return null;
    },
    [],
  );

  const createFile = useCallback(
    async (parentNode: FileNode | null, name: string) => {
      if (provider === "backend") {
        if (!rootPath) return;
        const dirPath = parentNode?.backendPath || rootPath;
        try {
          await BackendFSProvider.createFile(dirPath, rootPath, name);
          const { tree: rawTree } = await BackendFSProvider.readDir(rootPath);
          const nodes = (rawTree.children ?? []).map((c) =>
            backendNodeToFileNode(c, rootPath, ""),
          );
          setTree(nodes);
        } catch (err) {
          console.error("[FileSystem] createFile backend error:", err);
        }
      } else {
        const dirHandle = await resolveDirectoryHandle(parentNode);
        if (!dirHandle) return;

        try {
          const fileHandle = await NativeFSProvider.createFile(dirHandle, name);
          if (rootHandleRef.current) {
            const nodes = await NativeFSProvider.buildTree(
              rootHandleRef.current,
              rootHandleRef.current.name,
            );
            setTree(nodes);
          }
          const parentId = parentNode?.id ?? rootName ?? "";
          const newNode: FileNode = {
            id: `${parentId}/${name}`,
            name,
            kind: "file",
            handle: fileHandle,
          };
          await openTab(newNode);
        } catch (err) {
          console.error("[FileSystem] createFile native error:", err);
        }
      }
    },
    [resolveDirectoryHandle, rootName, openTab, provider, rootPath],
  );

  const createDirectory = useCallback(
    async (parentNode: FileNode | null, name: string) => {
      if (provider === "backend") {
        if (!rootPath) return;
        const dirPath = parentNode?.backendPath || rootPath;
        try {
          await BackendFSProvider.createDirectory(dirPath, rootPath, name);
          const { tree: rawTree } = await BackendFSProvider.readDir(rootPath);
          const nodes = (rawTree.children ?? []).map((c) =>
            backendNodeToFileNode(c, rootPath, ""),
          );
          setTree(nodes);
        } catch (err) {
          console.error("[FileSystem] createDir backend error:", err);
        }
      } else {
        const dirHandle = await resolveDirectoryHandle(parentNode);
        if (!dirHandle) return;

        try {
          await NativeFSProvider.createDirectory(dirHandle, name);
          if (rootHandleRef.current) {
            const nodes = await NativeFSProvider.buildTree(
              rootHandleRef.current,
              rootHandleRef.current.name,
            );
            setTree(nodes);
          }
        } catch (err) {
          console.error("[FileSystem] createDir native error:", err);
        }
      }
    },
    [resolveDirectoryHandle, provider, rootPath],
  );

  const deleteEntry = useCallback(
    async (node: FileNode) => {
      if (provider === "backend") {
        if (!rootPath || !node.backendPath) return;
        try {
          await BackendFSProvider.deleteEntry(node.backendPath, rootPath);

          setTabs((prev) => prev.filter((t) => !t.id.startsWith(node.id)));
          setActiveTabId((curr) => {
            if (curr?.startsWith(node.id)) return null;
            return curr;
          });

          const { tree: rawTree } = await BackendFSProvider.readDir(rootPath);
          const nodes = (rawTree.children ?? []).map((c) =>
            backendNodeToFileNode(c, rootPath, ""),
          );
          setTree(nodes);
        } catch (err) {
          console.error("[FileSystem] delete backend error:", err);
        }
      } else {
        if (!rootHandleRef.current) return;

        const pathParts = node.id.split("/");
        pathParts.pop();

        let parentHandle: FileSystemDirectoryHandle = rootHandleRef.current;
        if (pathParts.length > 1) {
          for (const part of pathParts.slice(1)) {
            parentHandle = await parentHandle.getDirectoryHandle(part);
          }
        }

        try {
          await NativeFSProvider.deleteEntry(parentHandle, node.name, true);

          setTabs((prev) => prev.filter((t) => !t.id.startsWith(node.id)));
          setActiveTabId((curr) => {
            if (curr?.startsWith(node.id)) return null;
            return curr;
          });

          const nodes = await NativeFSProvider.buildTree(
            rootHandleRef.current!,
            rootHandleRef.current!.name,
          );
          setTree(nodes);
        } catch (err) {
          console.error("[FileSystem] delete native error:", err);
        }
      }
    },
    [provider, rootPath],
  );

  // ── Context value ────────────────────────────────────────────────────────

  const value = useMemo<FileSystemContextValue>(
    () => ({
      tree,
      rootName,
      hasFolder: rootName !== null,
      isLoading,
      expandedIds,
      toggleExpanded,
      openFolder,
      openFolderFromPath,
      closeFolder,
      createFile,
      createDirectory,
      deleteEntry,
      tabs,
      activeTabId,
      openTab,
      closeTab,
      setActiveTab: setActiveTabId,
      handleContentChange,
      saveActiveTab,
      saveStatus,
      isNativeFSSupported: isNativeFSSupported(),
      provider,
    }),
    [
      tree,
      rootName,
      isLoading,
      expandedIds,
      toggleExpanded,
      openFolder,
      openFolderFromPath,
      closeFolder,
      createFile,
      createDirectory,
      deleteEntry,
      tabs,
      activeTabId,
      openTab,
      closeTab,
      handleContentChange,
      saveActiveTab,
      saveStatus,
      provider,
    ],
  );

  return (
    <FileSystemContext.Provider value={value}>
      {children}
    </FileSystemContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFileSystem(): FileSystemContextValue {
  const ctx = useContext(FileSystemContext);
  if (!ctx) {
    throw new Error("useFileSystem must be used inside <FileSystemProvider>");
  }
  return ctx;
}
