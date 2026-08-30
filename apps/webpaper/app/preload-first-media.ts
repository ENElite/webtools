import { preload } from 'react-dom';

import type { MediaPlayerInitialPage } from '../src/features/player';

/** Emit an image preload into the RSC response for the media shown first. */
export function preloadFirstMediaImage(initialPage: MediaPlayerInitialPage | null): string | null {
    const firstImage = initialPage?.page.items.find((item) => item.kind === 'image');
    if (!firstImage) return null;
    preload(firstImage.url, { as: 'image', fetchPriority: 'high' });
    return firstImage.url;
}
