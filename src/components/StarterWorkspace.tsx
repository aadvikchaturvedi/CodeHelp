import React from 'react'
import { Code2, Lightbulb, Code, Zap, Eye } from "lucide-react";

type StarterWorkspaceProps = {
  onOpenFile?: (fileName: string) => void;
};

export default function StarterWorkspace({ onOpenFile }: StarterWorkspaceProps) {
  const handleNewFile = () => {
    // Create new file logic
    console.log("Creating new file...");
  };

  return (
    <section className="flex-1 bg-zinc-950 flex flex-col items-center justify-center pt-12 overflow-y-auto">
      <div className="w-full max-w-2xl px-8">
        {/* Welcome Section */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <Code2 size={56} className="text-amber-500" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-zinc-100 mb-3 tracking-tight">
            Welcome to CodeHelp
          </h1>
          <p className="text-zinc-400 text-base leading-relaxed max-w-lg mx-auto">
            Select a file from the sidebar or create a new file to start coding.
            <br />
            <span className="text-zinc-500 text-sm">AI assistance with Ollama will appear here soon.</span>
          </p>
        </div>

        {/* Quick Actions - Premium Button Styling */}
        <div className="grid grid-cols-2 gap-6 mb-16">
          {/* Primary Button */}
          <button
            onClick={handleNewFile}
            className="group relative px-8 py-3.5 bg-linear-to-br from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg font-semibold text-base transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-amber-500/20 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="flex items-center justify-center gap-2">
              <span className="text-lg">+</span>
              <span>New File</span>
            </span>
          </button>

          {/* Secondary Button */}
          <button
            onClick={() => onOpenFile?.("README.md")}
            className="px-8 py-3.5 bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-100 rounded-lg font-semibold text-base transition-all duration-200 border border-zinc-700/60 hover:border-zinc-600/80 hover:shadow-lg active:scale-[0.98]"
          >
            <span className="flex items-center justify-center gap-2">
              <span>Open File</span>
            </span>
          </button>
        </div>

        {/* Tips Section - Enhanced Design */}
        <div className="bg-linear-to-br from-zinc-800/40 to-zinc-900/40 border border-zinc-700/30 rounded-xl p-8 backdrop-blur-sm mb-16 hover:border-zinc-700/50 transition-colors duration-200">
          <div className="flex gap-4">
            <div className="p-2.5 bg-amber-500/10 rounded-lg shrink-0">
              <Lightbulb size={20} className="text-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-zinc-100 font-semibold text-lg mb-4">Pro Tips</h3>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-center gap-3 hover:text-zinc-300 transition-colors">
                  <span className="text-amber-500/60">•</span>
                  Press <kbd className="bg-zinc-900/60 px-2.5 py-1 rounded text-zinc-300 border border-zinc-700/50 text-xs font-mono">Ctrl+K</kbd> to open Command Palette
                </li>
                <li className="flex items-center gap-3 hover:text-zinc-300 transition-colors">
                  <span className="text-amber-500/60">•</span>
                  Use <kbd className="bg-zinc-900/60 px-2.5 py-1 rounded text-zinc-300 border border-zinc-700/50 text-xs font-mono">Ctrl+Shift+E</kbd> to toggle Explorer
                </li>
                <li className="flex items-center gap-3 hover:text-zinc-300 transition-colors">
                  <span className="text-amber-500/60">•</span>
                  Search files with <kbd className="bg-zinc-900/60 px-2.5 py-1 rounded text-zinc-300 border border-zinc-700/50 text-xs font-mono">Ctrl+Shift+F</kbd>
                </li>
                <li className="flex items-center gap-3 hover:text-zinc-300 transition-colors">
                  <span className="text-amber-500/60">•</span>
                  Format code with <kbd className="bg-zinc-900/60 px-2.5 py-1 rounded text-zinc-300 border border-zinc-700/50 text-xs font-mono">Shift+Alt+F</kbd>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Features Section - Premium Cards */}
        <div className="space-y-4 pb-16">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-600 font-semibold mb-6">
              Coming Soon
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: "Monaco Editor", desc: "Full-featured code editor", Icon: Code },
              { title: "AI Assistant", desc: "Refactor & debug help", Icon: Zap },
              { title: "Live Preview", desc: "Run code in browser", Icon: Eye },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="group bg-linear-to-br from-zinc-800/30 to-zinc-900/20 border border-zinc-700/40 rounded-lg p-4 hover:border-amber-500/30 hover:bg-zinc-800/40 transition-all duration-200 cursor-pointer transform hover:scale-[1.02]"
              >
                <div className="mb-2">
                  <feature.Icon size={28} className="text-amber-400" />
                </div>
                <p className="text-zinc-100 text-sm font-semibold group-hover:text-amber-400 transition-colors">{feature.title}</p>
                <p className="text-zinc-500 text-xs leading-relaxed mt-1">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
