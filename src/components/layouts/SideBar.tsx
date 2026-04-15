"use client";

import React, { useState } from "react";
import FileItem from "@/components/FileItem";

type FileType = {
  id: string;
  name: string;
  content: string;
  language: string;
};

export default function Sidebar() {
  const [files] = useState<FileType[]>([
    {
      id: "1",
      name: "page.tsx",
      content: "",
      language: "typescript",
    },
    {
      id: "2",
      name: "globals.css",
      content: "",
      language: "css",
    },
    {
      id: "3",
      name: "README.md",
      content: "",
      language: "markdown",
    },
  ]);

  const [selectedFile, setSelectedFile] = useState<FileType | null>(files[0]);

  return (
    <aside className="w-64 h-full bg-zinc-950 border-r border-zinc-800/70 text-zinc-100 flex flex-col">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-zinc-800/60">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">
          Explorer
        </h2>

        <button className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-100 transition-all hover:bg-zinc-700 active:scale-[0.98]">
          + New File
        </button>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-screen">
        {files.map((file) => (
          <FileItem
            key={file.id}
            name={file.name}
            isActive={selectedFile?.id === file.id}
            onClick={() => setSelectedFile(file)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800/60 px-3 py-2 text-xs text-zinc-500">
        {files.length} files
      </div>
    </aside>
  );
}