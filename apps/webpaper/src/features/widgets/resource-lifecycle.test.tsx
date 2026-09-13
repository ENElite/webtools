// @vitest-environment jsdom

import {
    createSignalHub,
    type ComponentRuntimeSignalMap,
    type JsonObject,
    type WidgetEntity,
} from '@webtools/widget-core';
import type { WidgetViewPlugin } from '@webtools/widget-react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { htmlWidgetView, type HtmlWidgetProps } from './html';
import { iframeWidgetView, type IframeWidgetProps } from './iframe';
import { imageWidgetView, type ImageWidgetProps } from './image';
import {
    LIVE2D_BUILTIN_MODELS,
    live2dWidgetView,
    type Live2dWidgetProps,
} from './live2d';
import { videoWidgetView, type VideoWidgetProps } from './video';

function widget<TProps extends JsonObject>(kind: string, props: TProps): WidgetEntity<TProps> {
    return { kind, props } as WidgetEntity<TProps>;
}

function resourceKey<TProps extends JsonObject>(
    view: WidgetViewPlugin,
    kind: string,
    props: TProps,
): string | null | undefined {
    return view.readinessKey?.(widget(kind, props));
}

describe('resource widget lifecycle', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        document.body.innerHTML = '';
    });

    function renderResource(view: WidgetViewPlugin, entity: WidgetEntity) {
        const lifecycle = {
            onError: vi.fn(),
            onProgress: vi.fn(),
            onReady: vi.fn(),
        };
        const View = view.View;
        act(() => {
            root.render(
                <View
                    widget={entity}
                    selected={false}
                    signals={createSignalHub<ComponentRuntimeSignalMap>()}
                    {...lifecycle}
                />,
            );
        });
        return lifecycle;
    }

    it.each([
        {
            label: 'image',
            view: imageWidgetView,
            entity: widget<ImageWidgetProps>('image', {
                src: 'https://example.com/image.png',
                alt: 'image',
                objectFit: 'cover',
                objectPosition: 'center',
            }),
            selector: 'img',
            event: 'load',
        },
        {
            label: 'video',
            view: videoWidgetView,
            entity: widget<VideoWidgetProps>('video', {
                src: 'https://example.com/video.mp4',
                poster: '',
                objectFit: 'cover',
                autoPlay: false,
                muted: true,
                loop: false,
                controls: false,
            }),
            selector: 'video',
            event: 'loadeddata',
        },
        {
            label: 'iframe',
            view: iframeWidgetView,
            entity: widget<IframeWidgetProps>('iframe', {
                url: 'https://example.com/embed',
                title: 'embed',
                allow: '',
            }),
            selector: 'iframe',
            event: 'load',
        },
        {
            label: 'html',
            view: htmlWidgetView,
            entity: widget<HtmlWidgetProps>('html', {
                html: '<p>ready</p>',
                title: 'preview',
            }),
            selector: 'iframe',
            event: 'load',
        },
    ])('reports real $label DOM readiness', ({ view, entity, selector, event }) => {
        const lifecycle = renderResource(view, entity);
        const element = container.querySelector(selector);

        expect(element).not.toBeNull();
        act(() => element?.dispatchEvent(new Event(event, { bubbles: true })));

        expect(lifecycle.onProgress).toHaveBeenLastCalledWith(1, 1);
        expect(lifecycle.onReady).toHaveBeenCalledOnce();
        expect(lifecycle.onError).not.toHaveBeenCalled();
    });

    it.each([
        {
            label: 'image',
            view: imageWidgetView,
            entity: widget<ImageWidgetProps>('image', {
                src: 'https://example.com/broken.png',
                alt: '',
                objectFit: 'cover',
                objectPosition: 'center',
            }),
            selector: 'img',
        },
        {
            label: 'video',
            view: videoWidgetView,
            entity: widget<VideoWidgetProps>('video', {
                src: 'https://example.com/broken.mp4',
                poster: '',
                objectFit: 'cover',
                autoPlay: false,
                muted: true,
                loop: false,
                controls: false,
            }),
            selector: 'video',
        },
        {
            label: 'iframe',
            view: iframeWidgetView,
            entity: widget<IframeWidgetProps>('iframe', {
                url: 'https://example.com/broken',
                title: 'broken',
                allow: '',
            }),
            selector: 'iframe',
        },
        {
            label: 'html',
            view: htmlWidgetView,
            entity: widget<HtmlWidgetProps>('html', {
                html: '<p>broken</p>',
                title: 'broken',
            }),
            selector: 'iframe',
        },
    ])('reports $label DOM errors', ({ view, entity, selector }) => {
        const lifecycle = renderResource(view, entity);
        const element = container.querySelector(selector);

        expect(element).not.toBeNull();
        act(() => element?.dispatchEvent(new Event('error')));

        expect(lifecycle.onError).toHaveBeenCalledOnce();
        expect(lifecycle.onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
        expect(lifecycle.onReady).not.toHaveBeenCalled();
    });

    it('keys readiness only by each widget actual resource', () => {
        const image = {
            src: 'https://example.com/image.png',
            alt: 'first label',
            objectFit: 'cover',
            objectPosition: 'center',
        } satisfies ImageWidgetProps;
        const html = { html: '<p>one</p>', title: 'first title' } satisfies HtmlWidgetProps;
        const live2d = {
            source: 'builtin',
            modelUrl: '',
            modelPath: LIVE2D_BUILTIN_MODELS[0].value,
            scale: 1,
            renderPrecision: 100,
            resizeDelay: 0,
            interaction: true,
            clickMotion: true,
            motionGroup: '',
            motionIndex: -1,
            motionPriority: 2,
        } satisfies Live2dWidgetProps;

        expect(resourceKey(imageWidgetView, 'image', image))
            .toBe(resourceKey(imageWidgetView, 'image', { ...image, alt: 'second label' }));
        expect(resourceKey(imageWidgetView, 'image', image))
            .not.toBe(resourceKey(imageWidgetView, 'image', { ...image, src: 'https://example.com/next.png' }));
        expect(resourceKey(htmlWidgetView, 'html', html))
            .toBe(resourceKey(htmlWidgetView, 'html', { ...html, title: 'second title' }));
        expect(resourceKey(htmlWidgetView, 'html', html))
            .not.toBe(resourceKey(htmlWidgetView, 'html', { ...html, html: '<p>two</p>' }));
        expect(resourceKey(live2dWidgetView, 'live2d', live2d))
            .toBe(resourceKey(live2dWidgetView, 'live2d', { ...live2d, scale: 2 }));
        expect(resourceKey(live2dWidgetView, 'live2d', live2d))
            .not.toBe(resourceKey(live2dWidgetView, 'live2d', {
                ...live2d,
                source: 'url',
                modelUrl: 'https://example.com/custom.model3.json',
            }));
    });
});
