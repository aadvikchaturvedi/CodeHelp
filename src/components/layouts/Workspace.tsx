import React from "react";
import StarterWorkspace from "../StarterWorkspace";
import CodeEditor from "@/components/CodeEditor";

type EditorTab = {
  id: string;
  name: string;
  isDirty?: boolean;
  content?: string;
  language?: string;
};

type WorkspaceProps = {
  activeTab?: EditorTab;
  onOpenFile?: (fileName: string) => void;
  hasOpenTabs?: boolean;
};

export default function Workspace({ activeTab, onOpenFile, hasOpenTabs = false }: WorkspaceProps) {
  // Show starter workspace if no tab is selected
  if (!activeTab) {
    return <StarterWorkspace onOpenFile={onOpenFile} />;
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
      <CodeEditor
        fileName={activeTab.name}
        content={activeTab.content || ""}
        language={activeTab.language || "javascript"}
      />
    </div>
  );
}