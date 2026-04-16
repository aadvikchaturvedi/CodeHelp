import React from "react";
import { Code2, FileCode2, Palette, FileText, FileJson, File } from "lucide-react";

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
  // Get file icon based on extension
  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith(".tsx") || fileName.endsWith(".ts"))
      return Code2;
    if (fileName.endsWith(".css") || fileName.endsWith(".scss"))
      return Palette;
    if (fileName.endsWith(".md")) return FileText;
    if (fileName.endsWith(".json")) return FileJson;
    if (fileName.endsWith(".js")) return FileCode2;
    return File;
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group relative w-full rounded-md px-3 py-2 text-left
        flex items-center gap-2.5 overflow-hidden
        transition-all duration-150 cursor-pointer
        border border-transparent
        ${
          isActive
            ? "bg-zinc-700 text-amber-400 border-zinc-600"
            : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
        }
      `}
    >
      {/* File Icon */}
      {React.createElement(getFileIcon(name), {
        size: 16,
        className: "flex-shrink-0 opacity-90",
      })}

      {/* File Name */}
      <span className="truncate text-sm font-normal">{name}</span>

      {/* Active indicator */}
      {isActive && (
        <span className="absolute left-0 top-0 h-full w-0.5 bg-amber-500 rounded-r" />
      )}
    </button>
  );
}