import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { ImageMediaItem, VideoMediaItem } from '../../domain';
import { MediaStage } from './media-stage';
import { DEFAULT_MEDIA_PLAYER_SETTINGS } from './player-settings';

describe('MediaStage', () => {
    it('renders image media with its preview as the backdrop', () => {
        const item: ImageMediaItem = {
            id: 'image',
            sourceId: 'json',
            kind: 'image',
            url: '/image.jpg',
            previewUrl: '/preview.jpg',
            raw: null,
        };
        const markup = renderToStaticMarkup(
            <MediaStage
                item={item}
                settings={DEFAULT_MEDIA_PLAYER_SETTINGS}
                onMediaError={vi.fn()}
                onVideoEnded={vi.fn()}
            />,
        );

        expect(markup).toContain('data-media-kind="image"');
        expect(markup).toContain('src="/preview.jpg"');
        expect(markup).toContain('src="/image.jpg"');
        expect(markup).not.toContain('<video');
    });

    it('renders playable video media and its poster', () => {
        const item: VideoMediaItem = {
            id: 'video',
            sourceId: 'json',
            kind: 'video',
            url: '/video.mp4',
            posterUrl: '/poster.jpg',
            raw: null,
        };
        const markup = renderToStaticMarkup(
            <MediaStage
                item={item}
                settings={DEFAULT_MEDIA_PLAYER_SETTINGS}
                onMediaError={vi.fn()}
                onVideoEnded={vi.fn()}
            />,
        );

        expect(markup).toContain('data-media-kind="video"');
        expect(markup).toContain('<video');
        expect(markup).toContain('src="/video.mp4"');
        expect(markup).toContain('poster="/poster.jpg"');
    });
});
