import { preload } from 'react-dom';

import type { MediaPlayerInitialPage } from '../src/features/player';

export interface InitialMediaImagePreloads {
    readonly current: string | null;
    readonly next: string | null;
}

/** Emit high/low-priority image preloads for the first two playback positions. */
export function preloadInitialMediaImages(
    initialPage: MediaPlayerInitialPage | null,
): InitialMediaImagePreloads {
    const currentItem = initialPage?.page.items[0];
    const nextItem = initialPage?.page.items[1];
    const current = currentItem?.kind === 'image' ? currentItem.url : null;
    const next = nextItem?.kind === 'image' ? nextItem.url : null;

    if (current) preload(current, { as: 'image', fetchPriority: 'high' });
    if (next && next !== current) preload(next, { as: 'image', fetchPriority: 'low' });
    return Object.freeze({ current, next });
}
