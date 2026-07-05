import { describe, it } from "node:test";
import assert from "node:assert";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  FileSystemContext,
  type FileSystemContextValue,
} from "../../context/FileSystemContext";
import Workspace from "./Workspace";

const defaultContextValue: FileSystemContextValue = {
  tree: [],
  rootName: null,
  hasFolder: false,
  isLoading: false,
  expandedIds: new Set<string>(),
  toggleExpanded: () => {},
  openFolder: async () => {},
  openFolderFromPath: async () => {},
  closeFolder: () => {},
  createFile: async () => {},
  createDirectory: async () => {},
  deleteEntry: async () => {},
  tabs: [],
  activeTabId: null,
  openTab: async () => {},
  closeTab: () => {},
  setActiveTab: () => {},
  handleContentChange: () => {},
  saveActiveTab: async () => {},
  saveStatus: {},
  isNativeFSSupported: false,
  provider: "native",
};

function renderWithFileSystem(
  ui: React.ReactElement,
  overrides: { hasFolder: boolean; openFolder?: () => Promise<void> },
) {
  return renderToString(
    <FileSystemContext.Provider
      value={{ ...defaultContextValue, ...overrides }}
    >
      {ui}
    </FileSystemContext.Provider>,
  );
}

describe("Workspace folder-open behavior", () => {
  it("hides the starter screen when a folder is open but no editor tab is active", () => {
    const html = renderWithFileSystem(
      <Workspace activeTab={undefined} />,
      { hasFolder: true },
    );

    assert.ok(
      !html.includes("Welcome to CodeHelp"),
      "Expected the starter welcome screen to be hidden after a folder is opened",
    );
    assert.ok(
      html.includes("Select a file from the Explorer"),
      "Expected a folder-open placeholder to be shown",
    );
  });

  it("still shows the starter screen when no folder is open and no tab is active", () => {
    const html = renderWithFileSystem(
      <Workspace activeTab={undefined} />,
      { hasFolder: false },
    );

    assert.ok(
      html.includes("Welcome to CodeHelp"),
      "Expected the starter welcome screen when no folder is open",
    );
  });
});
