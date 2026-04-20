import { describe, expect, it } from 'vitest';

import { createWidgetRegistry, registerWidgetRenderer, resolveWidgetRenderer } from '../registry';

describe('overlay widget registry', () => {
    it('registers and resolves renderer by kind', () => {
        const renderer = () => null;
        const registry = createWidgetRegistry();
        const updated = registerWidgetRenderer(registry, 'text', renderer);

        expect(resolveWidgetRenderer(updated, 'text')).toBe(renderer);
    });

    it('returns null when renderer is missing', () => {
        const registry = createWidgetRegistry();

        expect(resolveWidgetRenderer(registry, 'iframe')).toBeNull();
    });
});
