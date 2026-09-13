import { describe, expect, it, vi } from 'vitest';

import { createLive2dInstanceRegistry } from './live2d-instance-registry';

describe('Live2D instance registry', () => {
    it('does not dispose Cubism while a sibling instance is still active', () => {
        const registry = createLive2dInstanceRegistry();
        const first = { destroy: vi.fn() };
        const second = { destroy: vi.fn() };

        registry.acquire(first);
        registry.acquire(second);
        registry.release(first);

        expect(first.destroy).not.toHaveBeenCalled();
        expect(second.destroy).not.toHaveBeenCalled();

        registry.release(second);
        expect(first.destroy).toHaveBeenCalledOnce();
        expect(second.destroy).toHaveBeenCalledOnce();

        registry.release(first);
        registry.release(second);
        expect(first.destroy).toHaveBeenCalledOnce();
        expect(second.destroy).toHaveBeenCalledOnce();
    });
});
