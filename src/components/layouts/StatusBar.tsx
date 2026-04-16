import React from "react";
import { AlertCircle, Zap, GitBranch } from "lucide-react";

export default function StatusBar() {
  return (
    <footer className="w-full h-7 bg-zinc-900 border-t border-zinc-800 flex items-center px-4 text-xs text-zinc-400 gap-6 shadow-lg">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <button className="hover:text-zinc-100 transition-colors flex items-center gap-1.5">
          <GitBranch size={14} />
          <span>main</span>
        </button>
        
        <button className="hover:text-zinc-100 transition-colors flex items-center gap-1.5">
          <AlertCircle size={14} />
          <span>0 problems</span>
        </button>
      </div>

      {/* Right Section */}
      <div className="ml-auto flex items-center gap-4">
        <span>UTF-8</span>
        <span>LF</span>
        <span>TypeScript JSX</span>
        <button className="flex items-center gap-1.5 hover:text-zinc-100 transition-colors">
          <Zap size={14} />
          <span>Ln 1, Col 1</span>
        </button>
      </div>
    </footer>
  );
}
