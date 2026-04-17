import React from "react";
import { useFileSystem } from "@/context/FileSystemContext";
import StarterWorkspace from "../StarterWorkspace";
import CodeEditor from "@/components/CodeEditor";
import type { EditorTab } from "@/lib/fs/types";

type WorkspaceProps = {
  activeTab?: EditorTab;
  onContentChange?: (newContent: string) => void;
  // Legacy — kept so old callers don't break
  onOpenFile?: (fileName: string) => void;
  hasOpenTabs?: boolean;
};

export default function Workspace({
  activeTab,
  onContentChange,
  onOpenFile,
}: WorkspaceProps) {
  const { openFolder } = useFileSystem();

  if (!activeTab) {
    return (
      <StarterWorkspace
        onOpenFile={onOpenFile}
        onOpenFolder={openFolder}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
      <CodeEditor
        key={activeTab.id} // re-mount Monaco when switching files
        fileName={activeTab.name}
        content={activeTab.content}
        language={activeTab.language}
        onChange={onContentChange}
      />
    </div>
  );
}