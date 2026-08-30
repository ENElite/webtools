/** @vitest-environment jsdom */

import { createComponentLoadPort, widgetComponentId } from '@webtools/widget-core';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    BACKGROUND_COMPONENT_ID,
    createWebpaperRuntimeSignals,
    STANDBY_COMPONENT_ID,
} from '../../application';
import type { ImageMediaItem, VideoMediaItem } from '../../domain';
import { MediaStage, MediaStageStandbyOverlay, StartupStandby } from './media-stage';
import { DEFAULT_MEDIA_PLAYER_SETTINGS } from './player-settings';

afterEach(() => vi.useRealTimers());

describe('MediaStage', () => {
    it('renders a repeated CSS sticker standby overlay without image assets', () => {
        const markup = renderToStaticMarkup(
            <MediaStageStandbyOverlay phase='waiting' status='loading' message='正在加载页面…' />,
        );

        expect(markup.match(/data-sticker-tile="true"/g)).toHaveLength(36);
        expect(markup.match(/data-grid-cell=/g)).toHaveLength(324);
        expect(markup).toContain('data-sticker="heart"');
        expect(markup).toContain('data-sticker="ice-cream"');
        expect(markup).toContain('data-sticker="star"');
        expect(markup).toContain('data-sticker="flower"');
        expect(markup).toContain('data-sticker="candy"');
        expect(markup).toContain('data-sticker="cherry"');
        expect(markup).toContain('data-sticker="moon"');
        expect(markup).toContain('data-sticker="paw"');
        expect(markup).toContain('data-sticker="sparkle"');
        expect(markup).toContain('role="progressbar"');
        expect(markup).not.toContain('<img');
        expect(markup).not.toContain('<svg');
    });

    it('renders image media with its preview as the backdrop', () => {
        const runtime = createWebpaperRuntimeSignals([]);
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
                signals={runtime.hub}
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
        const runtime = createWebpaperRuntimeSignals([]);
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
                signals={runtime.hub}
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

    it('waits for both the initial widgets and wallpaper before leaving standby', async () => {
        vi.useFakeTimers();
        const host = document.createElement('div');
        const root = createRoot(host);
        const runtime = createWebpaperRuntimeSignals(['clock-1']);
        const clock = createComponentLoadPort({
            hub: runtime.hub,
            componentId: widgetComponentId('clock-1'),
        });
        const starts: string[] = [];
        const completes: string[] = [];
        runtime.hub.connect('component.load.start', ({ source }) => starts.push(source.componentId));
        runtime.hub.connect('component.load.complete', ({ source }) => completes.push(source.componentId));
        const stopBarrier = runtime.startupBarrier.start();
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
                    <>
                        <MediaStage
                            item={item}
                            signals={runtime.hub}
                            settings={DEFAULT_MEDIA_PLAYER_SETTINGS}
                            onMediaError={vi.fn()}
                            onVideoEnded={vi.fn()}
                        />
                        <StartupStandby signals={runtime.hub} barrier={runtime.startupBarrier} />
                    </>,
                );
            });

            expect(host.querySelector('.wp-stage-status')?.getAttribute('data-phase')).toBe('waiting');
            expect(host.querySelector('.wp-sticker-wall img')).toBeNull();
            expect(host.querySelector('.wp-media-stage')?.hasAttribute('data-media-ready')).toBe(false);
            expect(starts).toContain(BACKGROUND_COMPONENT_ID);
            expect(starts).toContain(STANDBY_COMPONENT_ID);

            act(() => {
                host.querySelector<HTMLImageElement>('.wp-media-content')?.dispatchEvent(new Event('load'));
            });

            expect(host.querySelector('.wp-media-stage')?.getAttribute('data-media-ready')).toBe('true');
            expect(host.querySelector('.wp-stage-status')?.getAttribute('data-phase')).toBe('waiting');
            expect(completes).toContain(BACKGROUND_COMPONENT_ID);

            act(() => {
                clock.start('clock:initial').complete();
            });
            await act(async () => Promise.resolve());

            expect(host.querySelector('.wp-stage-status')?.getAttribute('data-phase')).toBe('celebrating');
            expect(host.querySelector('.wp-stage-progress')?.getAttribute('aria-valuenow')).toBe('100');

            act(() => vi.advanceTimersByTime(1_400));

            expect(host.querySelector('.wp-stage-status')).toBeNull();
            expect(completes).toContain(STANDBY_COMPONENT_ID);

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
                        signals={runtime.hub}
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
            stopBarrier();
        }
    });

    it('keeps standby visible while the media catalog has not returned an item', () => {
        vi.useFakeTimers();
        const host = document.createElement('div');
        const root = createRoot(host);
        const runtime = createWebpaperRuntimeSignals([]);
        const stopBarrier = runtime.startupBarrier.start();

        try {
            act(() => {
                root.render(
                    <>
                        <MediaStage
                            item={null}
                            signals={runtime.hub}
                            settings={DEFAULT_MEDIA_PLAYER_SETTINGS}
                            onMediaError={vi.fn()}
                            onVideoEnded={vi.fn()}
                        />
                        <StartupStandby
                            signals={runtime.hub}
                            barrier={runtime.startupBarrier}
                            status='loading'
                        />
                    </>,
                );
            });

            expect(host.querySelector('.wp-stage-status')?.getAttribute('data-phase')).toBe('waiting');
            act(() => vi.advanceTimersByTime(5_000));
            expect(host.querySelector('.wp-stage-status')?.getAttribute('data-phase')).toBe('waiting');
            expect(host.querySelector('.wp-media-stage')?.getAttribute('data-media-kind')).toBe('empty');
        } finally {
            act(() => root.unmount());
            stopBarrier();
        }
    });
});
