/**
 * Enhanced FileSystemNode — matches the spec for the AI-powered Explorer.
 * Each node can hold optional code content for AI context compilation.
 */

export interface FileSystemNode {
  id: string; // Unique path (e.g. "src/app/page.tsx")
  name: string;
  type: "file" | "folder";
  children?: FileSystemNode[]; // Only for folders
  isOpen?: boolean; // Only for folders, tracks UI expansion
  content?: string; // Only for files, tracks code/text
}

/**
 * Compiles a FileSystemNode[] tree into a single prompt-friendly markdown payload.
 * Format:
 *   ---
 *   ### WORKSPACE ARCHITECTURE
 *   - root/
 *     - src/
 *       - index.ts
 *   ...
 *   ### FILE CONTENTS
 *   // File: root/src/index.ts
 *   ```typescript
 *   ...content...
 *   ```
 *   ---
 */
export function compileWorkspaceContext(tree: FileSystemNode[], rootName = "root"): string {
  const lines: string[] = [];
  
  lines.push("---");
  lines.push("### WORKSPACE ARCHITECTURE");
  
  // 1. Render the tree structure
  function renderTree(nodes: FileSystemNode[], prefix = "", depth = 0): void {
    nodes.forEach((node, i) => {
      const isLast = i === nodes.length - 1;
      const connector = isLast ? "└── " : "├── ";
      const indent = prefix + (depth > 0 ? "  " : "");
      
      if (node.type === "folder") {
        lines.push(`${indent}${connector}${node.name}/`);
        if (node.children) {
          renderTree(node.children, indent + (isLast ? "  " : "│ "), depth + 1);
        }
      } else {
        lines.push(`${indent}${connector}${node.name}`);
      }
    });
  }
  
  lines.push(`  ${rootName}/`);
  if (tree.length > 0) {
    renderTree(tree, "", 1);
  }
  
  lines.push("");
  lines.push("### FILE CONTENTS");
  
  // 2. Concatenate all file contents as code blocks
  function collectFiles(nodes: FileSystemNode[], parentPath = ""): void {
    nodes.forEach((node) => {
      const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
      if (node.type === "file" && node.content != null) {
        lines.push("");
        lines.push(`// File: ${fullPath}`);
        lines.push(`\`\`\``);
        lines.push(node.content);
        lines.push("```");
      }
      if (node.type === "folder" && node.children) {
        collectFiles(node.children, fullPath);
      }
    });
  }
  
  collectFiles(tree);
  
  lines.push("---");
  return lines.join("\n");
}