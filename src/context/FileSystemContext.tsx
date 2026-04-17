"use client";

/**
 * FileSystemContext
 *
 * Single source of truth for all filesystem state in the IDE:
 *   - The file tree (from the opened folder)
 *   - Open editor tabs (with real file content)
 *   - Active tab
 *   - Save status per file
 *   - Folder operations (open, create, delete, rename)
 *
 * Architecture:
 *   FileSystemProvider wraps the whole app.
 *   Any component calls useFileSystem() to access state + actions.
 *   All reads/writes go through NativeFSProvider (File System Access API).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { NativeFSProvider, isNativeFSSupported } from "@/lib/fs/nativeProvider";
import { AutoSaveManager } from "@/lib/fs/autoSave";
import { detectLanguage, type EditorTab, type FileNode, type SaveStatus } from "@/lib/fs/types";

// ─── Context shape ────────────────────────────────────────────────────────────

interface FileSystemContextValue {
  // ── Tree ──────────────────────────────────────────────────────────────────
  /** Top-level file/directory nodes of the opened folder */
  tree: FileNode[];
  /** Display name of the opened folder (e.g. "my-project") */
  rootName: string | null;
  /** Whether a folder is currently open */
  hasFolder: boolean;
  /** Whether folder is being loaded */
  isLoading: boolean;
  /** Expanded folder IDs */
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;

  // ── Folder operations ─────────────────────────────────────────────────────
  /** Prompt user to pick a folder and mount it */
  openFolder: () => Promise<void>;
  /** Create a new file — pass the parent dir node (or null for root) */
  createFile: (parentNode: FileNode | null, name: string) => Promise<void>;
  /** Create a new directory */
  createDirectory: (parentNode: FileNode | null, name: string) => Promise<void>;
  /** Delete a file or directory */
  deleteEntry: (node: FileNode) => Promise<void>;

  // ── Tabs ──────────────────────────────────────────────────────────────────
  tabs: EditorTab[];
  activeTabId: string | null;
  openTab: (node: FileNode) => Promise<void>;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;

  // ── Editor ────────────────────────────────────────────────────────────────
  /** Called by Monaco whenever content changes — schedules auto-save */
  handleContentChange: (tabId: string, newContent: string) => void;
  /** Immediately save the active tab (Ctrl+S) */
  saveActiveTab: () => Promise<void>;
  saveStatus: Record<string, SaveStatus>;

  // ── Helpers ───────────────────────────────────────────────────────────────
  isNativeFSSupported: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const FileSystemContext = createContext<FileSystemContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function FileSystemProvider({ children }: { children: React.ReactNode }) {
  // Tree state
  const [tree, setTree] = useState<FileNode[]>([]);
  const [rootName, setRootName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Tabs state
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Save status per tab id
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});

  // The root directory handle (kept in ref so it doesn't trigger re-renders)
  const rootHandleRef = useRef<FileSystemDirectoryHandle | null>(null);

  // Auto-save manager (singleton, stable across renders)
  const autoSave = useMemo(() => new AutoSaveManager(NativeFSProvider, 800), []);

  // ── Folder operations ───────────────────────────────────────────────────

  const openFolder = useCallback(async () => {
    if (!isNativeFSSupported()) {
      alert("Your browser does not support the File System Access API.\nPlease use Chrome or Edge.");
      return;
    }

    try {
      const dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      setIsLoading(true);

      rootHandleRef.current = dirHandle;
      setRootName(dirHandle.name);

      const nodes = await NativeFSProvider.buildTree(dirHandle, dirHandle.name);
      setTree(nodes);

      // Auto-expand the first level
      const firstLevelIds = new Set(nodes.map((n) => n.id));
      setExpandedIds(firstLevelIds);

      // Clear all existing tabs when a new folder is opened
      setTabs([]);
      setActiveTabId(null);
      setSaveStatus({});
    } catch (err: unknown) {
      // User cancelled — not an error
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("[FileSystem] openFolder error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const openTab = useCallback(async (node: FileNode) => {
    if (node.kind !== "file" || !node.handle) return;

    const handle = node.handle as FileSystemFileHandle;

    // If already open, just activate it
    setTabs((prev) => {
      const existing = prev.find((t) => t.id === node.id);
      if (existing) {
        setActiveTabId(existing.id);
        return prev;
      }
      return prev; // will be set below after async read
    });

    // Check if already a tab
    setTabs((prev) => {
      if (prev.some((t) => t.id === node.id)) {
        setActiveTabId(node.id);
        return prev;
      }
      return prev;
    });

    // Early exit: if tab already exists just switch to it
    if (tabs.some((t) => t.id === node.id)) {
      setActiveTabId(node.id);
      return;
    }

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
        // Race-condition guard: don't add if it snuck in while we awaited
        if (prev.some((t) => t.id === node.id)) {
          setActiveTabId(node.id);
          return prev;
        }
        setActiveTabId(node.id);
        return [...prev, newTab];
      });

      setSaveStatus((prev) => ({ ...prev, [node.id]: "idle" }));
    } catch (err) {
      console.error("[FileSystem] openTab read error:", err);
    }
  }, [tabs]);

  const closeTab = useCallback((tabId: string) => {
    autoSave.cancel(tabId);
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === tabId);
      const next = prev.filter((t) => t.id !== tabId);
      setActiveTabId((currentActive) => {
        if (currentActive !== tabId) return currentActive;
        // Activate the tab to the left, or the next one, or null
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
  }, [autoSave]);

  // ── Content change + auto-save ──────────────────────────────────────────

  const handleContentChange = useCallback(
    (tabId: string, newContent: string) => {
      // Update content in tabs state and mark dirty
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId
            ? { ...t, content: newContent, isDirty: newContent !== t.savedContent }
            : t,
        ),
      );

      // Find the handle for this tab to schedule auto-save
      setTabs((prev) => {
        const tab = prev.find((t) => t.id === tabId);
        if (!tab?.handle) return prev;

        autoSave.schedule(
          tabId,
          tab.handle,
          newContent,
          () => setSaveStatus((s) => ({ ...s, [tabId]: "saving" })),
          () => {
            setSaveStatus((s) => ({ ...s, [tabId]: "saved" }));
            // Mark as clean once saved
            setTabs((p) =>
              p.map((t) =>
                t.id === tabId
                  ? { ...t, savedContent: newContent, isDirty: false }
                  : t,
              ),
            );
            // Reset to 'idle' after a short display window
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
        return prev; // don't mutate here, already mutated above
      });
    },
    [autoSave],
  );

  // ── Manual save (Ctrl+S) ────────────────────────────────────────────────

  const saveActiveTab = useCallback(async () => {
    if (!activeTabId) return;
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab?.handle) return;

    autoSave.cancel(activeTabId);
    setSaveStatus((s) => ({ ...s, [activeTabId]: "saving" }));

    try {
      await NativeFSProvider.writeFile(tab.handle, tab.content);
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, savedContent: tab.content, isDirty: false }
            : t,
        ),
      );
      setSaveStatus((s) => ({ ...s, [activeTabId]: "saved" }));
      setTimeout(
        () => setSaveStatus((s) => ({ ...s, [activeTabId]: "idle" })),
        1500,
      );
    } catch (err) {
      console.error("[FileSystem] save error:", err);
      setSaveStatus((s) => ({ ...s, [activeTabId]: "error" }));
    }
  }, [activeTabId, tabs, autoSave]);

  // ── File/dir creation ───────────────────────────────────────────────────

  /**
   * Find the FileSystemDirectoryHandle for a given FileNode.
   * Walks `rootHandleRef` using the node's id (path) segments.
   */
  const resolveDirectoryHandle = useCallback(
    async (node: FileNode | null): Promise<FileSystemDirectoryHandle | null> => {
      if (!rootHandleRef.current) return null;
      if (!node) return rootHandleRef.current;

      // node.handle is the dirHandle if kind === "directory"
      if (node.kind === "directory" && node.handle) {
        return node.handle as FileSystemDirectoryHandle;
      }
      return null;
    },
    [],
  );

  const createFile = useCallback(
    async (parentNode: FileNode | null, name: string) => {
      const dirHandle = await resolveDirectoryHandle(parentNode);
      if (!dirHandle) return;

      try {
        const fileHandle = await NativeFSProvider.createFile(dirHandle, name);
        // Rebuild the tree to reflect the new file
        if (rootHandleRef.current) {
          const nodes = await NativeFSProvider.buildTree(
            rootHandleRef.current,
            rootHandleRef.current.name,
          );
          setTree(nodes);
        }

        // Auto-open the newly created file
        const parentId = parentNode?.id ?? rootName ?? "";
        const newNode: FileNode = {
          id: `${parentId}/${name}`,
          name,
          kind: "file",
          handle: fileHandle,
        };
        await openTab(newNode);
      } catch (err) {
        console.error("[FileSystem] createFile error:", err);
      }
    },
    [resolveDirectoryHandle, rootName, openTab],
  );

  const createDirectory = useCallback(
    async (parentNode: FileNode | null, name: string) => {
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
        console.error("[FileSystem] createDirectory error:", err);
      }
    },
    [resolveDirectoryHandle],
  );

  const deleteEntry = useCallback(
    async (node: FileNode) => {
      if (!rootHandleRef.current) return;

      // Find parent directory handle by walking the path
      const pathParts = node.id.split("/");
      pathParts.pop(); // remove fileName

      let parentHandle: FileSystemDirectoryHandle = rootHandleRef.current;
      // Skip the first segment (root name) — already have the root handle
      if (pathParts.length > 1) {
        for (const part of pathParts.slice(1)) {
          parentHandle = await parentHandle.getDirectoryHandle(part);
        }
      }

      try {
        await NativeFSProvider.deleteEntry(parentHandle, node.name, true);

        // Close any open tabs for this node (or children of it if it's a dir)
        setTabs((prev) =>
          prev.filter((t) => !t.id.startsWith(node.id)),
        );
        setActiveTabId((curr) => {
          if (curr?.startsWith(node.id)) return null;
          return curr;
        });

        // Refresh tree
        const nodes = await NativeFSProvider.buildTree(
          rootHandleRef.current!,
          rootHandleRef.current!.name,
        );
        setTree(nodes);
      } catch (err) {
        console.error("[FileSystem] deleteEntry error:", err);
      }
    },
    [],
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
    }),
    [
      tree,
      rootName,
      isLoading,
      expandedIds,
      toggleExpanded,
      openFolder,
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
