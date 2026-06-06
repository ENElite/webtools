import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ImageVirtualGrid } from '@/components/imageGrid';

type ResizeEntry = {
    target: Element;
    contentRect: DOMRectReadOnly;
};

function createResizeObserverMock(width: number, height: number) {
    let callback: ResizeObserverCallback | null = null;

    class ResizeObserverMock {
        constructor(nextCallback: ResizeObserverCallback) {
            callback = nextCallback;
        }

        observe(target: Element) {
            callback?.([
                {
                    target,
                    contentRect: {
                        x: 0,
                        y: 0,
                        width,
                        height,
                        top: 0,
                        left: 0,
                        bottom: height,
                        right: width,
                        toJSON() {
                            return this;
                        },
                    } as DOMRectReadOnly,
                } as ResizeEntry,
            ]);
        }

        unobserve() { }

        disconnect() { }

        takeRecords() {
            return [];
        }
    }

    return ResizeObserverMock;
}

function renderGrid(items: Array<{ src: string; alt?: string }>, options?: { aspectRatio?: number; gap?: number; overscan?: number }) {
    const container = document.createElement('div');
    container.style.width = '440px';
    container.style.height = '250px';
    document.body.appendChild(container);

    const root = createRoot(container);

    act(() => {
        root.render(
            <ImageVirtualGrid
                items={items}
                aspectRatio={options?.aspectRatio}
                gap={options?.gap}
                overscan={options?.overscan}
            />
        );
    });

    return { container, root };
}

function getGridTrack(container: HTMLElement): HTMLDivElement | null {
    const viewport = container.querySelector('[data-testid="image-virtual-grid"]');
    if (!viewport) {
        return null;
    }

    return Array.from(viewport.children).find((child) => child instanceof HTMLDivElement) as HTMLDivElement | null;
}

function getImages(container: HTMLElement): HTMLImageElement[] {
    return Array.from(container.querySelectorAll('img'));
}

describe('ImageVirtualGrid', () => {
    let originalResizeObserver: typeof ResizeObserver | undefined;

    beforeEach(() => {
        originalResizeObserver = globalThis.ResizeObserver;
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        (globalThis as unknown as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver = createResizeObserverMock(440, 250) as unknown as typeof ResizeObserver;
    });

    afterEach(() => {
        globalThis.ResizeObserver = originalResizeObserver as typeof ResizeObserver;
        document.body.innerHTML = '';
    });

    it('renders only the visible rows and keeps four equal columns', async () => {
        const items = Array.from({ length: 20 }, (_, index) => ({ src: `https://example.com/${index}.jpg`, alt: `image-${index}` }));
        const { container, root } = renderGrid(items, { aspectRatio: 1, gap: 10, overscan: 0 });

        const viewport = container.querySelector('[data-testid="image-virtual-grid"]') as HTMLElement | null;
        expect(viewport).toBeTruthy();

        const images = getImages(container);
        expect(images.length).toBe(12);
        expect(images[0]?.getAttribute('src')).toBe('https://example.com/0.jpg');

        const grid = Array.from(viewport?.children || []).find((child) => {
            return child instanceof HTMLDivElement && child.style.display === 'grid';
        }) as HTMLDivElement | undefined;
        expect(grid?.style.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))');

        await act(async () => {
            if (viewport) {
                viewport.scrollTop = 400;
                viewport.dispatchEvent(new Event('scroll', { bubbles: true }));
            }

            await Promise.resolve();
        });

        const scrolledImages = getImages(container);
        expect(scrolledImages.length).toBe(8);
        expect(scrolledImages[0]?.getAttribute('src')).toBe('https://example.com/12.jpg');

        act(() => {
            root.unmount();
        });
    });

    it('uses zero gap by default', () => {
        const items = [{ src: 'https://example.com/cover.jpg' }];
        const { container, root } = renderGrid(items);

        const grid = getGridTrack(container);
        expect(grid?.style.gap).toBe('0px');

        act(() => {
            root.unmount();
        });
    });

    it('renders featured blocks in featured layout mode', () => {
        const items = Array.from({ length: 10 }, (_, index) => ({ src: `https://example.com/${index}.jpg` }));
        const container = document.createElement('div');
        container.style.width = '440px';
        container.style.height = '260px';
        document.body.appendChild(container);
        const root = createRoot(container);

        const featuredIndexes = new Set<number>();

        act(() => {
            root.render(
                <ImageVirtualGrid
                    items={items}
                    layoutMode='featured'
                    renderItem={({ index, featured }) => {
                        if (featured) {
                            featuredIndexes.add(index);
                        }

                        return <div data-testid='featured-tile' data-featured={featured ? 'yes' : 'no'} />;
                    }}
                />
            );
        });

        const tiles = container.querySelectorAll('[data-testid="featured-tile"]');
        expect(tiles.length).toBe(10);
        expect(Array.from(featuredIndexes)).toEqual([0, 5]);
        expect(container.querySelectorAll('[data-featured="yes"]').length).toBe(2);

        act(() => {
            root.unmount();
        });
    });

    it('falls back to the default 16:9 aspect ratio', () => {
        const items = [{ src: 'https://example.com/cover.jpg' }];
        const { container, root } = renderGrid(items);

        const imageWrapper = Array.from(container.querySelector('[data-testid="image-virtual-grid"]')?.querySelectorAll('div') || []).find((node) => {
            return node instanceof HTMLDivElement && node.style.aspectRatio;
        }) as HTMLDivElement | undefined;
        expect(imageWrapper?.style.aspectRatio).toBe(String(16 / 9));

        act(() => {
            root.unmount();
        });
    });
});
