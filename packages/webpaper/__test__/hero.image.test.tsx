import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ImageHero, type ImageHeroMode } from '@/features/paper/hero/image';

type MockImageInstance = {
    onload: ((event: Event) => void) | null;
    onerror: ((event: Event) => void) | null;
    src: string;
};

function getImageElement(container: HTMLElement, selector: string): HTMLImageElement {
    const element = container.querySelector(selector);
    if (!(element instanceof HTMLImageElement)) {
        throw new Error(`Image not found: ${selector}`);
    }

    return element;
}

function getOptionalImageElement(container: HTMLElement, selector: string): HTMLImageElement | null {
    const element = container.querySelector(selector);
    return element instanceof HTMLImageElement ? element : null;
}

function createMockImageController() {
    const pending = new Map<string, MockImageInstance[]>();

    class MockImage {
        public onload: ((event: Event) => void) | null = null;

        public onerror: ((event: Event) => void) | null = null;

        public referrerPolicy = '';

        public decoding: 'sync' | 'async' | 'auto' = 'auto';

        private value = '';

        public get src(): string {
            return this.value;
        }

        public set src(next: string) {
            this.value = next;
            const list = pending.get(next) || [];
            list.push(this);
            pending.set(next, list);
        }
    }

    const trigger = (url: string, type: 'load' | 'error') => {
        const list = pending.get(url) || [];
        pending.delete(url);

        for (const item of list) {
            if (type === 'load') {
                item.onload?.(new Event('load'));
            } else {
                item.onerror?.(new Event('error'));
            }
        }
    };

    return { MockImage, trigger };
}

function renderHero(
    mode: ImageHeroMode,
    onImageError: () => void,
    options?: { previewUrl?: string | null; imageUrl?: string }
): {
    container: HTMLElement;
    root: Root;
    rerender: (next: { mode?: ImageHeroMode; imageUrl?: string; previewUrl?: string | null }) => void;
} {
    let url = options?.imageUrl || 'https://image.example/full.jpg';
    let preview = options?.previewUrl === undefined ? 'https://image.example/preview.jpg' : options.previewUrl;
    let currentMode = mode;

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const render = () => {
        root.render(
            <ImageHero
                mode={currentMode}
                url={url}
                preview={preview}
                objectFit='contain'
                trackScale={100}
                trackIntensity={0}
                enableMouseTracking={false}
                onImageError={onImageError}
            />
        );
    };

    act(() => {
        render();
    });

    return {
        container,
        root,
        rerender: (next) => {
            url = next.imageUrl ?? url;
            preview = next.previewUrl === undefined ? preview : next.previewUrl;
            currentMode = next.mode ?? currentMode;
            act(() => {
                render();
            });
        },
    };
}

describe('ImageHero mode strategies', () => {
    let originalImage: typeof Image;
    let originalActEnv: boolean | undefined;

    beforeEach(() => {
        originalImage = globalThis.Image;
        originalActEnv = (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    });

    afterEach(() => {
        globalThis.Image = originalImage;
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = originalActEnv;
        document.body.innerHTML = '';
    });

    it('mode=imageOnly: clears previous frame first, then sets both background and foreground to imageUrl', async () => {
        const controller = createMockImageController();
        globalThis.Image = controller.MockImage as unknown as typeof Image;

        const onImageError = vi.fn();
        const { container, root } = renderHero('imageOnly', onImageError);

        const background = getImageElement(container, 'img[alt="preview"]');
        let foreground = getOptionalImageElement(container, 'img[alt="image"]');

        expect(background.getAttribute('src')).toBeNull();
        expect(foreground).toBeNull();

        await act(async () => {
            await Promise.resolve();
        });

        foreground = getImageElement(container, 'img[alt="image"]');
        expect(background.getAttribute('src')).toBe('https://image.example/full.jpg');
        expect(foreground.getAttribute('src')).toBe('https://image.example/full.jpg');
        expect(onImageError).not.toHaveBeenCalled();

        act(() => {
            root.unmount();
        });
    });

    it('mode=imageAsync: loads foreground first and sets both images after success', async () => {
        const controller = createMockImageController();
        globalThis.Image = controller.MockImage as unknown as typeof Image;

        const onImageError = vi.fn();
        const { container, root } = renderHero('imageAsync', onImageError);

        const background = getImageElement(container, 'img[alt="preview"]');
        let foreground = getOptionalImageElement(container, 'img[alt="image"]');

        expect(background.getAttribute('src')).toBeNull();
        expect(foreground).toBeNull();

        await act(async () => {
            controller.trigger('https://image.example/full.jpg', 'load');
            await Promise.resolve();
        });

        foreground = getImageElement(container, 'img[alt="image"]');
        expect(background.getAttribute('src')).toBe('https://image.example/full.jpg');
        expect(foreground.getAttribute('src')).toBe('https://image.example/full.jpg');
        expect(onImageError).not.toHaveBeenCalled();

        act(() => {
            root.unmount();
        });
    });

    it('mode=allAsync: each image updates only after its own onload', async () => {
        const controller = createMockImageController();
        globalThis.Image = controller.MockImage as unknown as typeof Image;

        const onImageError = vi.fn();
        const { container, root } = renderHero('allAsync', onImageError);

        const background = getImageElement(container, 'img[alt="preview"]');
        let foreground = getOptionalImageElement(container, 'img[alt="image"]');

        expect(background.getAttribute('src')).toBeNull();
        expect(foreground).toBeNull();

        await act(async () => {
            controller.trigger('https://image.example/preview.jpg', 'load');
            await Promise.resolve();
        });

        expect(background.getAttribute('src')).toBe('https://image.example/preview.jpg');
        foreground = getOptionalImageElement(container, 'img[alt="image"]');
        expect(foreground).toBeNull();

        await act(async () => {
            controller.trigger('https://image.example/full.jpg', 'load');
            await Promise.resolve();
        });

        foreground = getImageElement(container, 'img[alt="image"]');
        expect(foreground.getAttribute('src')).toBe('https://image.example/full.jpg');
        expect(onImageError).not.toHaveBeenCalled();

        act(() => {
            root.unmount();
        });
    });

    it('mode=previewAsync: updates both when preview finishes regardless of foreground load', async () => {
        const controller = createMockImageController();
        globalThis.Image = controller.MockImage as unknown as typeof Image;

        const onImageError = vi.fn();
        const { container, root } = renderHero('previewAsync', onImageError);

        const background = getImageElement(container, 'img[alt="preview"]');
        let foreground = getOptionalImageElement(container, 'img[alt="image"]');

        expect(background.getAttribute('src')).toBeNull();
        expect(foreground).toBeNull();

        await act(async () => {
            controller.trigger('https://image.example/preview.jpg', 'load');
            await Promise.resolve();
        });

        foreground = getImageElement(container, 'img[alt="image"]');
        expect(background.getAttribute('src')).toBe('https://image.example/preview.jpg');
        expect(foreground.getAttribute('src')).toBe('https://image.example/full.jpg');
        expect(onImageError).not.toHaveBeenCalled();

        act(() => {
            root.unmount();
        });
    });

    it('mode=previewAsync: keeps previous background until new preview is ready', async () => {
        const controller = createMockImageController();
        globalThis.Image = controller.MockImage as unknown as typeof Image;

        const onImageError = vi.fn();
        const { container, root, rerender } = renderHero('previewAsync', onImageError, {
            imageUrl: 'https://image.example/old-full.jpg',
            previewUrl: 'https://image.example/old-preview.jpg',
        });

        const background = getImageElement(container, 'img[alt="preview"]');
        let foreground = getOptionalImageElement(container, 'img[alt="image"]');

        await act(async () => {
            controller.trigger('https://image.example/old-preview.jpg', 'load');
            await Promise.resolve();
        });

        foreground = getImageElement(container, 'img[alt="image"]');
        expect(background.getAttribute('src')).toBe('https://image.example/old-preview.jpg');
        expect(foreground.getAttribute('src')).toBe('https://image.example/old-full.jpg');

        rerender({
            imageUrl: 'https://image.example/new-full.jpg',
            previewUrl: 'https://image.example/new-preview.jpg',
            mode: 'previewAsync',
        });

        expect(background.getAttribute('src')).toBe('https://image.example/old-preview.jpg');
        foreground = getOptionalImageElement(container, 'img[alt="image"]');
        expect(foreground).toBeNull();

        await act(async () => {
            controller.trigger('https://image.example/new-preview.jpg', 'load');
            await Promise.resolve();
        });

        foreground = getImageElement(container, 'img[alt="image"]');
        expect(background.getAttribute('src')).toBe('https://image.example/new-preview.jpg');
        expect(foreground.getAttribute('src')).toBe('https://image.example/new-full.jpg');

        act(() => {
            root.unmount();
        });
    });

    it('mode=allSync: sets preview background immediately, then promotes foreground on background onLoad', async () => {
        const controller = createMockImageController();
        globalThis.Image = controller.MockImage as unknown as typeof Image;

        const onImageError = vi.fn();
        const { container, root } = renderHero('allSync', onImageError);

        const background = getImageElement(container, 'img[alt="preview"]');
        let foreground = getOptionalImageElement(container, 'img[alt="image"]');

        expect(background.getAttribute('src')).toBeNull();
        expect(foreground).toBeNull();

        await act(async () => {
            await Promise.resolve();
        });

        expect(background.getAttribute('src')).toBe('https://image.example/preview.jpg');
        foreground = getOptionalImageElement(container, 'img[alt="image"]');
        expect(foreground).toBeNull();

        await act(async () => {
            background.dispatchEvent(new Event('load'));
            await Promise.resolve();
        });

        foreground = getImageElement(container, 'img[alt="image"]');
        expect(foreground.getAttribute('src')).toBe('https://image.example/full.jpg');
        expect(onImageError).not.toHaveBeenCalled();

        act(() => {
            root.unmount();
        });
    });

    it('fallbacks to imageUrl when previewUrl is null', async () => {
        const controller = createMockImageController();
        globalThis.Image = controller.MockImage as unknown as typeof Image;

        const onImageError = vi.fn();
        const { container, root } = renderHero('allSync', onImageError, { previewUrl: null });

        const background = getImageElement(container, 'img[alt="preview"]');

        expect(background.getAttribute('src')).toBeNull();

        await act(async () => {
            await Promise.resolve();
        });

        expect(background.getAttribute('src')).toBe('https://image.example/full.jpg');

        act(() => {
            root.unmount();
        });
    });

    it('fallbacks to imageUrl when previewUrl is invalid', async () => {
        const controller = createMockImageController();
        globalThis.Image = controller.MockImage as unknown as typeof Image;

        const onImageError = vi.fn();
        const { container, root } = renderHero('allAsync', onImageError, {
            previewUrl: 'http://[::1',
        });

        const background = getImageElement(container, 'img[alt="preview"]');
        let foreground = getOptionalImageElement(container, 'img[alt="image"]');

        expect(background.getAttribute('src')).toBeNull();
        expect(foreground).toBeNull();

        await act(async () => {
            controller.trigger('https://image.example/full.jpg', 'load');
            await Promise.resolve();
        });

        foreground = getImageElement(container, 'img[alt="image"]');
        // 预览图 URL 无效，背景图不会被设置；前景图在完整图加载后设置
        expect(background.getAttribute('src')).toBeNull();
        expect(foreground.getAttribute('src')).toBe('https://image.example/full.jpg');
        expect(onImageError).not.toHaveBeenCalled();

        act(() => {
            root.unmount();
        });
    });

    it('mode=previewSync: sets background immediately, then sets foreground when preview or full image loads', async () => {
        const controller = createMockImageController();
        globalThis.Image = controller.MockImage as unknown as typeof Image;

        const onImageError = vi.fn();
        const { container, root } = renderHero('previewSync', onImageError);

        const background = getImageElement(container, 'img[alt="preview"]');
        let foreground = getOptionalImageElement(container, 'img[alt="image"]');

        // 背景应该立即设置为预览图
        expect(background.getAttribute('src')).toBe('https://image.example/preview.jpg');
        expect(foreground).toBeNull();

        // 当完整图加载完成时，设置前景
        await act(async () => {
            controller.trigger('https://image.example/full.jpg', 'load');
            await Promise.resolve();
        });

        foreground = getImageElement(container, 'img[alt="image"]');
        expect(foreground.getAttribute('src')).toBe('https://image.example/full.jpg');
        expect(background.getAttribute('src')).toBe('https://image.example/preview.jpg');
        expect(onImageError).not.toHaveBeenCalled();

        act(() => {
            root.unmount();
        });
    });

    it('mode=previewSync: sets foreground when preview loads first', async () => {
        const controller = createMockImageController();
        globalThis.Image = controller.MockImage as unknown as typeof Image;

        const onImageError = vi.fn();
        const { container, root } = renderHero('previewSync', onImageError);

        const background = getImageElement(container, 'img[alt="preview"]');
        let foreground = getOptionalImageElement(container, 'img[alt="image"]');

        // 背景应该立即设置为预览图
        expect(background.getAttribute('src')).toBe('https://image.example/preview.jpg');
        expect(foreground).toBeNull();

        // 当预览图加载完成时，设置前景
        await act(async () => {
            controller.trigger('https://image.example/preview.jpg', 'load');
            await Promise.resolve();
        });

        foreground = getImageElement(container, 'img[alt="image"]');
        expect(foreground.getAttribute('src')).toBe('https://image.example/full.jpg');
        expect(background.getAttribute('src')).toBe('https://image.example/preview.jpg');
        expect(onImageError).not.toHaveBeenCalled();

        act(() => {
            root.unmount();
        });
    });
});
