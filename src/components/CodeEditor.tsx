"use client";

/**
 * CodeEditor — Monaco wrapper.
 *
 * Accepts real file content from FileSystemContext.
 * Calls onChange on every keystroke; the parent schedules auto-save.
 *
 * Key decisions:
 *   - `key` is set to the file path at the Workspace level so Monaco
 *     is fully remounted when switching files (avoids stale model issues).
 *   - defaultValue is used (not value) so Monaco controls its own state
 *     and we don't fight it on every keystroke with controlled re-renders.
 */

import { Editor, type OnMount } from "@monaco-editor/react";
import React, { useRef } from "react";

type CodeEditorProps = {
  fileName?: string;
  content?: string;
  language?: string;
  onChange?: (value: string) => void;
};

export default function CodeEditor({
  fileName = "Untitled",
  content = "",
  language = "plaintext",
  onChange,
}: CodeEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
    // Set focus so the user can type immediately
    editor.focus();
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#1e1e1e]">
      <Editor
        height="100%"
        width="100%"
        theme="vs-dark"
        language={language}
        // Use defaultValue so Monaco manages its own model state.
        // We remount via `key` at the Workspace level when files change.
        defaultValue={content}
        onMount={handleMount}
        onChange={(value) => onChange?.(value ?? "")}
        options={{
          fontSize: 14,
          fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Courier New', monospace",
          fontLigatures: true,
          minimap: { enabled: true, scale: 1 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: "phase",
          cursorSmoothCaretAnimation: "on",
          lineNumbers: "on",
          glyphMargin: true,
          folding: true,
          foldingHighlight: true,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
          renderLineHighlight: "all",
          bracketPairColorization: { enabled: true },
          autoClosingBrackets: "always",
          autoClosingQuotes: "always",
          formatOnPaste: true,
          tabSize: 2,
          wordWrap: "off",
          scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            useShadows: true,
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
          padding: { top: 16, bottom: 16 },
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          parameterHints: { enabled: true },
          codeLens: true,
          inlineSuggest: { enabled: true },
        }}
      />
    </div>
  );
}
