import React from "react";

type FileItemProps = {
  name: string;
  isActive?: boolean;
  onClick?: () => void;
};

export default function FileItem({
  name,
  isActive = false,
  onClick,
}: FileItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group relative w-full rounded-lg px-3 py-2 text-left
        flex items-center gap-2 overflow-hidden
        transition-all duration-200 cursor-pointer
        border border-transparent
        ${
          isActive
            ? "bg-zinc-800 text-amber-300 border-zinc-700 shadow-sm"
            : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
        }
      `}
    >
      {/* Left Active Indicator */}
      {isActive && (
        <span className="absolute left-0 top-0 h-full w-1 bg-amber-400 rounded-r" />
      )}

      {/* Icon */}
      <span className="text-sm opacity-80 shrink-0">-</span>

      {/* File Name */}
      <span className="truncate text-sm font-medium">{name}</span>
    </button>
  );
}