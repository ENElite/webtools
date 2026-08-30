/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
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

    it('celebrates only after the first media actually loads, then fades the waiting room away', () => {
        vi.useFakeTimers();
        const host = document.createElement('div');
        const root = createRoot(host);
        const item: ImageMediaItem = {
            id: 'ready-image',
            sourceId: 'json',
            kind: 'image',
            url: '/ready-image.jpg',
            raw: null,
        };

        try {
            act(() => {
                root.render(
                    <MediaStage
                        item={item}
                        settings={DEFAULT_MEDIA_PLAYER_SETTINGS}
                        onMediaError={vi.fn()}
                        onVideoEnded={vi.fn()}
                    />,
                );
            });

            expect(host.querySelector('.wp-stage-status')?.getAttribute('data-phase')).toBe('waiting');
            expect(host.querySelector('.wp-waiting-room img')).toBeNull();
            expect(host.querySelector('.wp-media-stage')?.hasAttribute('data-media-ready')).toBe(false);

            act(() => {
                host.querySelector<HTMLImageElement>('.wp-media-content')?.dispatchEvent(new Event('load'));
            });

            expect(host.querySelector('.wp-stage-status')?.getAttribute('data-phase')).toBe('celebrating');
            expect(host.querySelector('.wp-media-stage')?.getAttribute('data-media-ready')).toBe('true');

            act(() => vi.advanceTimersByTime(1_400));

            expect(host.querySelector('.wp-stage-status')).toBeNull();

            const videoItem: VideoMediaItem = {
                id: 'next-video',
                sourceId: 'json',
                kind: 'video',
                url: '/next-video.mp4',
                raw: null,
            };
            act(() => {
                root.render(
                    <MediaStage
                        item={videoItem}
                        settings={DEFAULT_MEDIA_PLAYER_SETTINGS}
                        onMediaError={vi.fn()}
                        onVideoEnded={vi.fn()}
                    />,
                );
            });

            expect(host.querySelector('.wp-stage-status')?.getAttribute('data-phase')).toBe('waiting');
            act(() => {
                host.querySelector<HTMLVideoElement>('.wp-media-content')
                    ?.dispatchEvent(new Event('loadeddata'));
            });

            expect(host.querySelector('.wp-media-stage')?.getAttribute('data-media-ready')).toBe('true');
            expect(host.querySelector('.wp-stage-status')).toBeNull();
        } finally {
            act(() => root.unmount());
            vi.useRealTimers();
        }
    });
});
