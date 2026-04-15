import React from 'react'
import { Search, Play, Save, Settings } from 'lucide-react' // Optional: if you use icons

export default function TopBar() {
  return (
    <header className="bg-zinc-950 border border-zinc-800/50 text-zinc-400 w-full h-14 px-4 flex items-center gap-4 rounded-2xl shadow-2xl">
      
      {/* 1. Project Name / Search Bar (Takes major space) */}
      <div className="flex-1 flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all px-4 py-1.5 rounded-xl group cursor-text">
        <span className="text-amber-500 font-bold text-xs tracking-widest uppercase opacity-80">
          Project:
        </span>
        <span className="text-zinc-200 font-medium text-sm">
          CodeHelp_Main
        </span>
        <div className="ml-auto text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 group-hover:text-zinc-200">
          ⌘ K
        </div>
      </div>

      {/* 2. Action Group (Clean & Professional) */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button className="flex items-center gap-2 hover:bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg transition text-xs font-medium">
          <Save size={14} />
          Save
        </button>

        <button className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black px-4 py-1.5 rounded-lg transition text-xs font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <Play size={14} fill="currentColor" />
          Run
        </button>

        <div className="w-1 h-6 bg-zinc-800 mx-1" /> {/* Divider */}

        <button className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition">
          <Settings size={18} />
        </button>
      </div>

    </header>
  )
}