import { create } from "zustand";
import type { FileSystemNode } from "./explorer-types";

/**
 * Recursively updates a node by its id in the tree.
 * Returns a new tree — does not mutate in place.
 */
function updateNodeById(
  nodes: FileSystemNode[],
  id: string,
  updater: (node: FileSystemNode) => FileSystemNode,
): FileSystemNode[] {
  return nodes.map((node) => {
    if (node.id === id) return updater(node);
    if (node.type === "folder" && node.children) {
      return {
        ...node,
        children: updateNodeById(node.children, id, updater),
      };
    }
    return node;
  });
}

/**
 * Recursively find a node by id.
 */
function findNodeById(nodes: FileSystemNode[], id: string): FileSystemNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.type === "folder" && node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface ExplorerState {
  tree: FileSystemNode[];
  rootName: string | null;
  hasFolder: boolean;
  selectedFileId: string | null;
  expandedIds: Set<string>;

  // Actions
  setTree: (tree: FileSystemNode[], rootName: string | null) => void;
  clearTree: () => void;
  selectFile: (id: string | null) => void;
  toggleExpand: (id: string) => void;
  setExpanded: (ids: Set<string>) => void;

  // CRUD
  addNode: (parentId: string | null, node: FileSystemNode) => void;
  removeNode: (id: string) => void;
  renameNode: (id: string, newName: string) => void;
  updateNodeContent: (id: string, content: string) => void;
}

export const useExplorerStore = create<ExplorerState>((set, get) => ({
  tree: [],
  rootName: null,
  hasFolder: false,
  selectedFileId: null,
  expandedIds: new Set(),

  setTree: (tree, rootName) =>
    set({ tree, rootName, hasFolder: true }),

  clearTree: () =>
    set({ tree: [], rootName: null, hasFolder: false, selectedFileId: null }),

  selectFile: (id) =>
    set({ selectedFileId: id }),

  toggleExpand: (id) =>
    set((state) => {
      const next = new Set(state.expandedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { expandedIds: next };
    }),

  setExpanded: (ids) =>
    set({ expandedIds: ids }),

  addNode: (parentId, node) =>
    set((state) => {
      if (parentId === null) {
        // Add to root
        return { tree: [...state.tree, node] };
      }
      // Add to a sub-folder
      const newTree = updateNodeById(state.tree, parentId, (parent) => ({
        ...parent,
        children: [...(parent.children ?? []), node],
      }));
      return { tree: newTree };
    }),

  removeNode: (id) =>
    set((state) => {
      const removeRecursive = (
        nodes: FileSystemNode[],
        targetId: string,
      ): FileSystemNode[] =>
        nodes
          .filter((n) => n.id !== targetId)
          .map((n) =>
            n.type === "folder" && n.children
              ? { ...n, children: removeRecursive(n.children, targetId) }
              : n,
          );

      return { tree: removeRecursive(state.tree, id) };
    }),

  renameNode: (id, newName) =>
    set((state) => ({
      tree: updateNodeById(state.tree, id, (node) => ({ ...node, name: newName })),
    })),

  updateNodeContent: (id, content) =>
    set((state) => ({
      tree: updateNodeById(state.tree, id, (node) => ({
        ...node,
        content: node.type === "file" ? content : node.content,
        ...(node.type === "file" ? { content } : {}),
      })),
    })),
}));

/**
 * Compiles the file tree into a single prompt-friendly markdown payload.
 * Same as compileWorkspaceContext but reads from the store's state.
 */
export function compileWorkspaceContext(tree: FileSystemNode[], rootName = "root"): string {
  const lines: string[] = [];
  
  lines.push("---");
  lines.push("### WORKSPACE ARCHITECTURE");
  lines.push(`  ${rootName}/`);

  function renderTree(nodes: FileSystemNode[], indent = "  "): void {
    nodes.forEach((node, i) => {
      const isLast = i === nodes.length - 1;
      const prefix = indent + (isLast ? "  " : "│ ");
      
      if (node.type === "folder") {
        lines.push(`${prefix}├── ${node.name}/`);
        if (node.children) renderTree(node.children, `${prefix}  `);
      } else {
        lines.push(`${prefix}├── ${node.name}`);
      }
    });
  }
  
  if (tree.length > 0) renderTree(tree);
  
  lines.push("");
  lines.push("### FILE CONTENTS");
  
  function collectFiles(nodes: FileSystemNode[], parentPath = ""): void {
    nodes.forEach((node) => {
      const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
      if (node.type === "file" && node.content != null) {
        lines.push("");
        lines.push(`// File: ${fullPath}`);
        lines.push("```");
        lines.push(node.content);
        lines.push("```");
      }
      if (node.type === "folder" && node.children) {
        collectFiles(node.children, fullPath);
      }
    });
  }
  
  collectFiles(tree);
  
  lines.push("---");
  return lines.join("\n");
}