import { Editor } from "@monaco-editor/react";
import React from "react";

type CodeEditorProps = {
  fileName?: string;
  content?: string;
  language?: string;
  onChange?: (value: string) => void;
};

export default function CodeEditor({
  fileName = "Untitled",
  content = "",
  language = "javascript",
  onChange,
}: CodeEditorProps) {
  return (
    <div className="w-full h-full flex flex-col bg-zinc-950">
      <Editor
        height="100%"
        width="100%"
        theme="vs-dark"
        language={language}
        value={content}
        onChange={(value) => onChange?.(value || "")}
        options={{
          fontSize: 14,
          fontFamily: "'Fira Code', 'Courier New', monospace",
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: "phase",
          lineNumbers: "on",
          glyphMargin: true,
          folding: true,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
        }}
      />
    </div>
  );
}
