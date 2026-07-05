"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import { useWorkspace } from "@/components/workspace-provider";
import { useFileSystem } from "@/context/FileSystemContext";

export default function InlineSuggest() {
  const { suggestions, requestProactiveSuggestion } = useWorkspace();
  const { tabs, activeTabId } = useFileSystem();
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (activeTab) {
      const timer = setTimeout(() => requestProactiveSuggestion(), 3000);
      return () => clearTimeout(timer);
    }
  }, [activeTab?.id, activeTab, requestProactiveSuggestion]);

  const visible = suggestions.filter((s) => !dismissed.has(s.id));

  if (!activeTab || visible.length === 0) return null;

  return (
    <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none">
      <div className="pointer-events-auto space-y-2">
        {visible.map((s) => (
          <div
            key={s.id}
            className="group animate-in slide-in-from-bottom-2 fade-in duration-300
              bg-zinc-900/90 backdrop-blur-xl border border-amber-500/20
              hover:border-amber-500/40 rounded-xl px-4 py-3
              shadow-[0_0_30px_rgba(217,119,6,0.08)]
              transition-all duration-300 ease-out
              hover:shadow-[0_0_40px_rgba(217,119,6,0.15)]
              hover:-translate-y-0.5"
          >
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-amber-500/10 shrink-0 mt-0.5
                group-hover:bg-amber-500/20 transition-colors duration-300">
                <Sparkles size={14} className="text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-300/80 uppercase tracking-wider mb-1">
                  {s.type === "optimize" ? "Optimize" : s.type === "fix" ? "Fix" : s.type === "doc" ? "Document" : "Suggestion"}
                </p>
                <p className="text-sm text-zinc-300 leading-relaxed">{s.description}</p>
                {s.code && (
                  <pre className="mt-2 p-2 bg-zinc-950/80 border border-zinc-800 rounded-lg text-xs text-zinc-400 overflow-x-auto font-mono">
                    <code>{s.code}</code>
                  </pre>
                )}
              </div>
              <button
                onClick={() => setDismissed((prev) => new Set(prev).add(s.id))}
                className="p-1 rounded-md hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300 transition-all shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
