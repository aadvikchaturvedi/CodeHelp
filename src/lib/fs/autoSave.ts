/**
 * Auto-save manager.
 *
 * Generic debounced write scheduler — accepts a save function
 * instead of a provider + handle, so it works in both native and
 * backend file system modes.
 */

type PendingTimer = ReturnType<typeof setTimeout>;

export class AutoSaveManager {
    private timers = new Map<string, PendingTimer>();
    private readonly delayMs: number;

    constructor(delayMs = 800) {
        this.delayMs = delayMs;
    }

    /**
     * Schedule a debounced write for the given file.
     * Cancels any previously-pending write for the same file.
     *
     * @param fileId     Stable identifier for this file (e.g. path string)
     * @param saveFn     Async function that performs the actual write
     * @param onSaving   Called when the write starts
     * @param onSaved    Called when the write completes successfully
     * @param onError    Called if the write fails
     */
    schedule(
        fileId: string,
        saveFn: () => Promise<void>,
        onSaving: () => void,
        onSaved: () => void,
        onError: (err: unknown) => void,
    ): void {
        const existing = this.timers.get(fileId);
        if (existing) clearTimeout(existing);

        const timer = setTimeout(async () => {
            this.timers.delete(fileId);
            onSaving();
            try {
                await saveFn();
                onSaved();
            } catch (err) {
                onError(err);
            }
        }, this.delayMs);

        this.timers.set(fileId, timer);
    }

    flushAll(): void {
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
    }

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
