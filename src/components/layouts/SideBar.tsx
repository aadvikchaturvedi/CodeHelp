"use client";

import React, { useState } from "react";
import FileItem from "@/components/FileItem";
import {
  ChevronDown,
  Plus,
  MoreVertical,
  ChevronLeft,
  Code2,
  FileCode2,
  Palette,
  FileText,
  Settings,
  Package,
  Zap,
  GitBranch,
  Box,
  Globe,
  File,
  Folder,
} from "lucide-react";

type FileType = {
  id: string;
  name: string;
  content: string;
  language: string;
};

type TreeItem = {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: TreeItem[];
  icon?: string;
  color?: string;
};

type SidebarProps = {
  activeTab?: string;
  onOpenFile?: ((fileName: string) => void) | null;
};

// Helper function to get icon and color based on file type
const getFileIcon = (name: string): { Component: React.ComponentType<any>; color: string } => {
  if (name.endsWith(".tsx") || name.endsWith(".jsx"))
    return { Component: Code2, color: "text-blue-400" };
  if (name.endsWith(".ts") || name.endsWith(".js"))
    return { Component: FileCode2, color: "text-yellow-400" };
  if (name.endsWith(".css") || name.endsWith(".scss"))
    return { Component: Palette, color: "text-purple-400" };
  if (name.endsWith(".md"))
    return { Component: FileText, color: "text-orange-400" };
  if (name.endsWith(".json"))
    return { Component: Settings, color: "text-orange-300" };
  if (name.endsWith(".mjs"))
    return { Component: Settings, color: "text-amber-400" };
  if (name.startsWith("."))
    return { Component: Settings, color: "text-red-400" };
  if (name === "node_modules")
    return { Component: Package, color: "text-green-400" };
  if (name === ".next")
    return { Component: Zap, color: "text-yellow-500" };
  if (name === ".git")
    return { Component: GitBranch, color: "text-red-500" };
  return { Component: File, color: "text-zinc-400" };
};

const getFolderIcon = (name: string): { Component: React.ComponentType<any>; color: string } => {
  if (name === "node_modules")
    return { Component: Package, color: "text-green-400" };
  if (name === ".next")
    return { Component: Zap, color: "text-yellow-500" };
  if (name === ".git")
    return { Component: GitBranch, color: "text-red-500" };
  if (name === "components" || name === "layouts")
    return { Component: Box, color: "text-blue-400" };
  if (name === "app")
    return { Component: Code2, color: "text-red-400" };
  if (name === "public")
    return { Component: Globe, color: "text-blue-300" };
  return { Component: Folder, color: "text-amber-400" };
};

export default function Sidebar({ activeTab = "explorer", onOpenFile }: SidebarProps) {
  const [files] = useState<FileType[]>([
    { id: "1", name: "page.tsx", content: "", language: "typescript" },
    { id: "2", name: "globals.css", content: "", language: "css" },
    { id: "3", name: "layout.tsx", content: "", language: "typescript" },
  ]);

  const fileTree: TreeItem[] = [
    { id: "git", name: ".git", type: "folder" },
    { id: "next", name: ".next", type: "folder" },
    { id: "node_modules", name: "node_modules", type: "folder" },
    {
      id: "public",
      name: "public",
      type: "folder",
      children: [],
    },
    {
      id: "src",
      name: "src",
      type: "folder",
      children: [
        {
          id: "app",
          name: "app",
          type: "folder",
          children: [
            { id: "api", name: "api", type: "folder", children: [] },
            { id: "editor", name: "editor", type: "folder", children: [] },
            { id: "f1", name: "globals.css", type: "file" },
            { id: "f2", name: "layout.tsx", type: "file" },
            { id: "f3", name: "page.tsx", type: "file" },
          ],
        },
        {
          id: "components",
          name: "components",
          type: "folder",
          children: [
            { id: "f4", name: "FileItem.tsx", type: "file" },
            {
              id: "layouts",
              name: "layouts",
              type: "folder",
              children: [
                { id: "f5", name: "ActivityBar.tsx", type: "file" },
                { id: "f6", name: "AppShell.tsx", type: "file" },
                { id: "f7", name: "EditorTabs.tsx", type: "file" },
                { id: "f8", name: "MainArea.tsx", type: "file" },
                { id: "f9", name: "SideBar.tsx", type: "file" },
                { id: "f10", name: "StatusBar.tsx", type: "file" },
                { id: "f11", name: "TopBar.tsx", type: "file" },
                { id: "f12", name: "Workspace.tsx", type: "file" },
              ],
            },
          ],
        },
      ],
    },
    { id: "f13", name: ".gitignore", type: "file" },
    { id: "f14", name: "AGENTS.md", type: "file" },
    { id: "f15", name: "CLAUDE.md", type: "file" },
    { id: "f16", name: "eslint.config.mjs", type: "file" },
    { id: "f17", name: "next-env.d.ts", type: "file" },
    { id: "f18", name: "next.config.ts", type: "file" },
    { id: "f19", name: "package.json", type: "file" },
    { id: "f20", name: "postcss.config.mjs", type: "file" },
    { id: "f21", name: "README.md", type: "file" },
    { id: "f22", name: "tsconfig.json", type: "file" },
  ];

  const [selectedFile, setSelectedFile] = useState<FileType | null>(files[0]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["codehelp", "src", "app", "components", "layouts"])
  );

  const toggleFolder = (id: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFolders(newExpanded);
  };

  const handleNewFile = () => {
    // Logic to create a new file
    console.log("New File button clicked");
  };

  const renderTreeItem = (item: TreeItem, level: number = 0): React.ReactNode => {
    if (item.type === "folder") {
      const { Component, color } = getFolderIcon(item.name);
      const isExpanded = expandedFolders.has(item.id);
      const hasChildren = item.children && item.children.length > 0;

      return (
        <div key={item.id}>
          <button
            onClick={() => toggleFolder(item.id)}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800/40 rounded-md w-full transition-all duration-150 text-zinc-300 text-sm font-medium group"
            style={{ paddingLeft: `${12 + level * 16}px` }}
          >
            <ChevronDown
              size={16}
              className={`transition-transform shrink-0 text-zinc-600 group-hover:text-zinc-400 ${
                isExpanded ? "" : "-rotate-90"
              }`}
            />
            <Component size={16} className={`shrink-0 ${color}`} />
            <span className="truncate text-zinc-300">{item.name}</span>
          </button>

          {isExpanded &&
            hasChildren &&
            item.children!.map((child) => renderTreeItem(child, level + 1))}
        </div>
      );
    } else {
      const { Component, color } = getFileIcon(item.name);
      return (
        <button
          key={item.id}
          onClick={() => {
            setSelectedFile({ id: item.id, name: item.name, content: "", language: "typescript" });
            onOpenFile?.(item.name);
          }}
          className={`
            flex items-center gap-2.5 px-3 py-1.5 w-full text-left
            rounded-md transition-all duration-150 text-sm font-medium truncate group
            ${
              selectedFile?.id === item.id
                ? "bg-amber-500/15 text-amber-300 border-l-2 border-amber-500"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30"
            }
          `}
          title={item.name}
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          <Component size={16} className={`shrink-0 ${color}`} />
          <span className="truncate">{item.name}</span>
        </button>
      );
    }
  };

  return (
    <aside className="w-56 h-full bg-zinc-900/80 border-r border-zinc-800/50 text-zinc-100 flex flex-col overflow-hidden animate-in fade-in duration-200 backdrop-blur-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800/50 flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-widest text-zinc-400 font-bold">
          {activeTab === "explorer" && "Explorer"}
          {activeTab === "search" && "Search"}
          {activeTab === "source" && "Source Control"}
          {activeTab === "run" && "Run & Debug"}
          {activeTab === "extensions" && "Extensions"}
        </h2>
        <div className="flex items-center gap-1 ml-auto">
          <button
            className="p-1.5 hover:bg-zinc-800/60 rounded-md transition-all duration-150 text-zinc-500 hover:text-zinc-300"
            title="More options"
          >
            <MoreVertical size={16} />
          </button>
          <button
            title="Close sidebar (Ctrl+B)"
            className="p-1.5 hover:bg-zinc-800/60 rounded-md transition-all duration-150 text-zinc-500 hover:text-zinc-300"
            onClick={() => {
              document.dispatchEvent(new CustomEvent("toggle-sidebar"));
            }}
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        <button
          onClick={() => toggleFolder("codehelp")}
          className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/50 rounded-md w-full transition-all duration-150 text-zinc-100 text-sm font-bold group"
        >
          <ChevronDown
            size={16}
            className={`transition-transform shrink-0 text-zinc-500 group-hover:text-zinc-300 ${
              expandedFolders.has("codehelp") ? "" : "-rotate-90"
            }`}
          />
          <Folder size={16} className="shrink-0 text-amber-400" />
          <span className="truncate">CODEHELP</span>
        </button>

        {expandedFolders.has("codehelp") && (
          <div className="space-y-0.5">
            {fileTree.map((item) => renderTreeItem(item, 1))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800/50 p-4">
        <button
          onClick={handleNewFile}
          className="w-full flex items-center justify-center gap-2.5 bg-linear-to-r from-amber-600/80 to-amber-700/80 hover:from-amber-500/80 hover:to-amber-600/80 text-white px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <Plus size={18} />
          <span>New File</span>
        </button>
      </div>
    </aside>
  );
}