"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Workspace from "@/components/layouts/Workspace";
import EditorTabs from "@/components/layouts/EditorTabs";

type EditorTab = {
  id: string;
  name: string;
  isDirty?: boolean;
  content?: string;
  language?: string;
};

type MainAreaProps = {
  onOpenFileChange?: (fn: (fileName: string) => void) => void;
};

export default function MainArea({ onOpenFileChange }: MainAreaProps) {
  const [tabs, setTabs] = useState<EditorTab[]>([
    {
      id: "1",
      name: "page.tsx",
      isDirty: false,
      content: "// Welcome to CodeHelp\n// Start editing this file",
      language: "typescript",
    },
  ]);

  const [activeTabId, setActiveTabId] = useState("1");

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  const getFileLanguage = (fileName: string) => {
    if (fileName.endsWith(".tsx") || fileName.endsWith(".ts")) return "typescript";
    if (fileName.endsWith(".jsx") || fileName.endsWith(".js")) return "javascript";
    if (fileName.endsWith(".css") || fileName.endsWith(".scss")) return "css";
    if (fileName.endsWith(".md")) return "markdown";
    if (fileName.endsWith(".json")) return "json";
    return "javascript";
  };

  const getFileContent = (fileName: string) => {
    const fileContents: Record<string, string> = {
      "page.tsx": `export default function Home() {
  return <div>Welcome to CodeHelp</div>;
}`,
    };

    return fileContents[fileName] || `// File: ${fileName}`;
  };

  const handleOpenFile = useCallback((fileName: string) => {
    if (!fileName) return;

    setTabs((prevTabs) => {
      const existing = prevTabs.find((tab) => tab.name === fileName);

      if (existing) {
        setActiveTabId(existing.id);
        return prevTabs;
      }

      const id = Date.now().toString();

      const newTab: EditorTab = {
        id,
        name: fileName,
        isDirty: false,
        content: getFileContent(fileName),
        language: getFileLanguage(fileName),
      };

      setActiveTabId(id);
      return [...prevTabs, newTab];
    });
  }, []);

  const handleTabClose = useCallback(
    (id: string) => {
      setTabs((prevTabs) => {
        const nextTabs = prevTabs.filter((tab) => tab.id !== id);

        if (activeTabId === id) {
          setActiveTabId(nextTabs[0]?.id ?? "");
        }

        return nextTabs;
      });
    },
    [activeTabId]
  );

  // Keep latest callback in ref
  const openFileRef = useRef(handleOpenFile);

  useEffect(() => {
    openFileRef.current = handleOpenFile;
  }, [handleOpenFile]);

  // Register to parent
  useEffect(() => {
    if (!onOpenFileChange) return;
    onOpenFileChange((fileName: string) => openFileRef.current(fileName));
  }, [onOpenFileChange]);

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
      <EditorTabs
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={setActiveTabId}
        onTabClose={handleTabClose}
      />

      <Workspace
        activeTab={activeTab}
        onOpenFile={handleOpenFile}
        hasOpenTabs={tabs.length > 0}
      />
    </div>
  );
}