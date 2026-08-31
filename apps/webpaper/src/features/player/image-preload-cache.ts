export type ImagePreloadStatus = 'loading' | 'ready';

export interface ImagePreloadCache {
    preload(url: string): Promise<boolean>;
    isReady(url: string): boolean;
    getStatus(url: string): ImagePreloadStatus | null;
    clear(): void;
}

export interface CreateImagePreloadCacheOptions {
    readonly capacity?: number;
    readonly createImage?: () => HTMLImageElement | null;
}

interface ImagePreloadEntry {
    readonly image: HTMLImageElement;
    readonly promise: Promise<boolean>;
    status: ImagePreloadStatus;
}

const DEFAULT_CAPACITY = 4;

/**
 * Keeps a small set of browser image requests alive. A ready entry means the
 * bytes reached the browser cache; decode() is also requested opportunistically.
 */
export function createImagePreloadCache(
    options: CreateImagePreloadCacheOptions = {},
): ImagePreloadCache {
    const capacity = options.capacity ?? DEFAULT_CAPACITY;
    if (!Number.isInteger(capacity) || capacity < 1) {
        throw new RangeError('Image preload cache capacity must be a positive integer.');
    }
    const entries = new Map<string, ImagePreloadEntry>();
    const createImage = options.createImage ?? (() => (
        typeof Image === 'undefined' ? null : new Image()
    ));

    const touch = (url: string, entry: ImagePreloadEntry) => {
        entries.delete(url);
        entries.set(url, entry);
    };
    const trim = () => {
        while (entries.size > capacity) {
            const oldestUrl = entries.keys().next().value as string | undefined;
            if (oldestUrl === undefined) return;
            entries.delete(oldestUrl);
        }
    };

    return Object.freeze({
        preload(url: string): Promise<boolean> {
            if (!url) return Promise.resolve(false);
            const existing = entries.get(url);
            if (existing) {
                touch(url, existing);
                return existing.promise;
            }

            const image = createImage();
            if (!image) return Promise.resolve(false);
            let resolveLoad: ((loaded: boolean) => void) | undefined;
            const promise = new Promise<boolean>((resolve) => {
                resolveLoad = resolve;
            });
            const entry: ImagePreloadEntry = { image, promise, status: 'loading' };
            entries.set(url, entry);
            trim();

            image.decoding = 'async';
            image.fetchPriority = 'low';
            image.referrerPolicy = 'no-referrer';
            image.onload = () => {
                entry.status = 'ready';
                resolveLoad?.(true);
                if (typeof image.decode === 'function') void image.decode().catch(() => undefined);
            };
            image.onerror = () => {
                if (entries.get(url) === entry) entries.delete(url);
                resolveLoad?.(false);
            };
            image.src = url;
            return promise;
        },
        isReady: (url: string) => entries.get(url)?.status === 'ready',
        getStatus: (url: string) => entries.get(url)?.status ?? null,
        clear: () => entries.clear(),
    });
}

export const browserImagePreloadCache = createImagePreloadCache();
