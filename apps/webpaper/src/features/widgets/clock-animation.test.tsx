// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnimatedClockText } from './clock-animation';

describe('AnimatedClockText', () => {
    const animate = vi.fn((
        _keyframes: Keyframe[] | PropertyIndexedKeyframes,
        _options?: number | KeyframeAnimationOptions,
    ) => ({ cancel: vi.fn() }));

    beforeEach(() => {
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        Object.defineProperty(HTMLSpanElement.prototype, 'animate', {
            configurable: true,
            value: animate,
        });
    });

    afterEach(() => {
        animate.mockClear();
        delete (HTMLSpanElement.prototype as { animate?: typeof Element.prototype.animate }).animate;
        document.body.innerHTML = '';
    });

    it('only bounces glyphs whose value changed', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);

        act(() => root.render(<AnimatedClockText text='12:34:56' />));
        expect(animate).not.toHaveBeenCalled();

        act(() => root.render(<AnimatedClockText text='12:34:57' />));
        expect(animate).toHaveBeenCalledOnce();
        expect(animate.mock.calls[0]?.[1]).toMatchObject({ duration: 320 });
        expect(container.querySelector('[data-clock-text="12:34:57"]')).not.toBeNull();

        act(() => root.unmount());
    });
});
