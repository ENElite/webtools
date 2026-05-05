import { describe, expect, it } from 'vitest';

import { splitSettingsValues } from '@/features/overlay/settings/settings_utils';
import type { WidgetModel } from '@/features/overlay/types';

function createWidget(): WidgetModel {
    return {
        id: 'widget-1',
        kind: 'text',
        label: '文本组件',
        props: {
            text: 'hello',
        },
        style: {
            transform: 'translate(12px, 18px) rotate(0deg)',
            width: '240px',
            height: '120px',
            borderRadius: '8px',
            opacity: 1,
        },
    };
}

describe('splitSettingsValues', () => {
    it('keeps opacity in style and out of props', () => {
        const widget = createWidget();
        const next = splitSettingsValues(
            {
                ...widget.props,
                width: 240,
                height: 120,
                x: 12,
                y: 18,
                rotation: 0,
                borderRadius: 8,
                opacity: 0.42,
            },
            widget
        );

        expect(next.style.opacity).toBe(0.42);
        expect(next.props.opacity).toBeUndefined();
        expect(next.props.color).toBeUndefined();
    });
});
