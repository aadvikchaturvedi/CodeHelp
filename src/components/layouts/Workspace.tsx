"use client";

import React from "react";
import { FolderOpen } from "lucide-react";
import { useFileSystem } from "@/context/FileSystemContext";
import StarterWorkspace from "../StarterWorkspace";
import CodeEditor from "@/components/CodeEditor";
import InlineSuggest from "@/components/inline-suggest";
import type { EditorTab } from "@/lib/fs/types";

type WorkspaceProps = {
  activeTab?: EditorTab;
  onContentChange?: (newContent: string) => void;
  onOpenFile?: (fileName: string) => void;
};

export default function Workspace({
  activeTab,
  onContentChange,
  onOpenFile,
}: WorkspaceProps) {
  const { openFolder, hasFolder } = useFileSystem();


  if (!activeTab) {
    if (!hasFolder) {
      return (
        <StarterWorkspace
          onOpenFile={onOpenFile}
          onOpenFolder={openFolder}
        />
      );
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-zinc-500">
        <FolderOpen size={48} className="mb-4 text-amber-500/50" />
        <p className="text-sm">Select a file from the Explorer to start editing</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden relative">
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2.5 py-1
        bg-zinc-900/80 border border-zinc-800/50 rounded-lg text-[10px] text-zinc-500 pointer-events-none
        backdrop-blur-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 shadow-[0_0_4px_rgba(0,0,0,0.3)]" />
        Read-only
      </div>

      <CodeEditor
        key={activeTab.id}
        fileName={activeTab.name}
        content={activeTab.content}
        language={activeTab.language}
        onChange={onContentChange}
      />

      <InlineSuggest />
    </div>
  );
}
