/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { ImageMediaItem, VideoMediaItem } from '../../domain';
import { MediaStage, MediaStageStandbyOverlay } from './media-stage';
import { DEFAULT_MEDIA_PLAYER_SETTINGS } from './player-settings';

describe('MediaStage', () => {
    it('renders a repeated CSS sticker standby overlay without image assets', () => {
        const markup = renderToStaticMarkup(
            <MediaStageStandbyOverlay phase='waiting' status='loading' message='正在加载页面…' />,
        );

        expect(markup.match(/data-sticker-tile="true"/g)).toHaveLength(64);
        expect(markup.match(/data-grid-cell=/g)).toHaveLength(256);
        expect(markup).toContain('data-sticker="heart"');
        expect(markup).toContain('data-sticker="ice-cream"');
        expect(markup).toContain('data-sticker="star"');
        expect(markup).toContain('data-sticker="flower"');
        expect(markup).not.toContain('data-sticker="candy"');
        expect(markup).toContain('role="progressbar"');
        expect(markup).not.toContain('<img');
        expect(markup).not.toContain('<svg');
    });

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

    it('waits for both the initial widgets and wallpaper before leaving standby', () => {
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
                        widgetsReady={false}
                        settings={DEFAULT_MEDIA_PLAYER_SETTINGS}
                        onMediaError={vi.fn()}
                        onVideoEnded={vi.fn()}
                    />,
                );
            });

            expect(host.querySelector('.wp-stage-status')?.getAttribute('data-phase')).toBe('waiting');
            expect(host.querySelector('.wp-sticker-wall img')).toBeNull();
            expect(host.querySelector('.wp-media-stage')?.hasAttribute('data-media-ready')).toBe(false);

            act(() => {
                host.querySelector<HTMLImageElement>('.wp-media-content')?.dispatchEvent(new Event('load'));
            });

            expect(host.querySelector('.wp-media-stage')?.getAttribute('data-media-ready')).toBe('true');
            expect(host.querySelector('.wp-stage-status')?.getAttribute('data-phase')).toBe('waiting');

            act(() => {
                root.render(
                    <MediaStage
                        item={item}
                        widgetsReady
                        settings={DEFAULT_MEDIA_PLAYER_SETTINGS}
                        onMediaError={vi.fn()}
                        onVideoEnded={vi.fn()}
                    />,
                );
            });

            expect(host.querySelector('.wp-stage-status')?.getAttribute('data-phase')).toBe('celebrating');
            expect(host.querySelector('.wp-stage-progress')?.getAttribute('aria-valuenow')).toBe('100');

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

            expect(host.querySelector('.wp-stage-status')).toBeNull();
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

    it('keeps standby visible while the media catalog has not returned an item', () => {
        vi.useFakeTimers();
        const host = document.createElement('div');
        const root = createRoot(host);

        try {
            act(() => {
                root.render(
                    <MediaStage
                        item={null}
                        widgetsReady
                        status='loading'
                        settings={DEFAULT_MEDIA_PLAYER_SETTINGS}
                        onMediaError={vi.fn()}
                        onVideoEnded={vi.fn()}
                    />,
                );
            });

            expect(host.querySelector('.wp-stage-status')?.getAttribute('data-phase')).toBe('waiting');
            act(() => vi.advanceTimersByTime(5_000));
            expect(host.querySelector('.wp-stage-status')?.getAttribute('data-phase')).toBe('waiting');
            expect(host.querySelector('.wp-media-stage')?.getAttribute('data-media-kind')).toBe('empty');
        } finally {
            act(() => root.unmount());
            vi.useRealTimers();
        }
    });
});
