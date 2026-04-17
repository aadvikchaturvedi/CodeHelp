/**
 * Auto-save manager.
 *
 * Wraps any IFileSystemProvider with debounced write logic.
 * Each file gets its own debounce timer so rapid edits in one file
 * don't cancel pending saves in another.
 */

import type { IFileSystemProvider } from "./types";

type PendingTimer = ReturnType<typeof setTimeout>;

export class AutoSaveManager {
    private timers = new Map<string, PendingTimer>();
    private readonly delayMs: number;
    private readonly provider: IFileSystemProvider;

    constructor(provider: IFileSystemProvider, delayMs = 800) {
        this.provider = provider;
        this.delayMs = delayMs;
    }

    /**
     * Schedule a debounced write for the given handle.
     * Cancels any previously-pending write for the same file.
     *
     * @param fileId     Stable identifier for this file (e.g. path string)
     * @param handle     The FileSystemFileHandle to write to
     * @param content    Latest editor content
     * @param onSaving   Called when the write starts
     * @param onSaved    Called when the write completes successfully
     * @param onError    Called if the write fails
     */
    schedule(
        fileId: string,
        handle: FileSystemFileHandle,
        content: string,
        onSaving: () => void,
        onSaved: () => void,
        onError: (err: unknown) => void,
    ): void {
        // Cancel the existing pending timer for this file
        const existing = this.timers.get(fileId);
        if (existing) clearTimeout(existing);

        const timer = setTimeout(async () => {
            this.timers.delete(fileId);
            onSaving();
            try {
                await this.provider.writeFile(handle, content);
                onSaved();
            } catch (err) {
                onError(err);
            }
        }, this.delayMs);

        this.timers.set(fileId, timer);
    }

    /**
     * Immediately flush all pending saves (e.g. before tab close or Ctrl+S).
     */
    flushAll(): void {
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
    }

    /**
     * Cancel the pending save for a specific file without writing.
     */
    cancel(fileId: string): void {
        const timer = this.timers.get(fileId);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(fileId);
        }
    }

    get hasPending(): boolean {
        return this.timers.size > 0;
    }
}
