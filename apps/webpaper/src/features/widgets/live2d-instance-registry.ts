export interface Live2dDisposableInstance {
    destroy(): void;
}

export function createLive2dInstanceRegistry() {
    const active = new Set<Live2dDisposableInstance>();
    const retired = new Set<Live2dDisposableInstance>();
    const released = new WeakSet<Live2dDisposableInstance>();

    return Object.freeze({
        acquire(instance: Live2dDisposableInstance): void {
            active.add(instance);
        },
        release(instance: Live2dDisposableInstance | null): void {
            if (!instance || released.has(instance)) return;
            released.add(instance);
            active.delete(instance);
            retired.add(instance);
            if (active.size > 0) return;

            for (const staleInstance of retired) {
                try {
                    staleInstance.destroy();
                } catch {
                    // A partially loaded instance must not block sibling cleanup.
                }
            }
            retired.clear();
        },
    });
}

/** One registry per browser module, matching Cubism's process-wide lifecycle. */
export const live2dInstanceRegistry = createLive2dInstanceRegistry();
