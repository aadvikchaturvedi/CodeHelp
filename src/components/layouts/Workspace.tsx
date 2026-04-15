import React from "react";

export default function Workspace() {
  return (
    <section className="flex-1 bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950/70 p-8 shadow-xl">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-500 mb-3">
            Workspace
          </p>

          <h1 className="text-3xl font-semibold text-zinc-100 mb-3">
            Welcome to CodeHelp
          </h1>

          <p className="text-sm text-zinc-400 leading-6 mb-6">
            Select a file from the sidebar or create a new file to begin coding.
            Local AI assistance with Ollama will appear here soon.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition-colors">
            + New File
          </button>

          <button className="flex-1 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-900 transition-colors">
            Open File
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
            Coming Soon
          </p>

          <ul className="space-y-2 text-sm text-zinc-400">
            <li>• Monaco Editor Integration</li>
            <li>• AI Refactor & Debug Assistant</li>
            <li>• Run Code in Browser</li>
          </ul>
        </div>
      </div>
    </section>
  );
}