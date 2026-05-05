import React from 'react';
import { act } from 'react';
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WidgetDynamicForm } from '@/features/overlay/settings/widget_dynamic_form';
import type { WidgetSettingsSchema } from '@/features/overlay/settings/schema';
import type { WidgetFlatProps } from '@/features/overlay/types';

vi.mock('@/features/editor', () => {
    return {
        AiEditorPanel: (props: {
            value?: string;
            onChange?: (content: string) => void;
        }) => {
            useEffect(() => {
                props.onChange?.(props.value ?? '');
            }, []);

            return <div data-testid='mock-ai-editor-panel'>mock-ai-editor-panel</div>;
        },
    };
});

const schema: WidgetSettingsSchema = [
    {
        key: 'text',
        label: '文本',
        type: 'string',
    },
    {
        key: 'fontSize',
        label: '字号',
        type: 'number',
        min: 8,
        max: 120,
    },
    {
        key: 'align',
        label: '对齐',
        type: 'enum',
        options: [
            { label: '左', value: 'left' },
            { label: '中', value: 'center' },
            { label: '右', value: 'right' },
        ],
    },
    {
        key: 'color',
        label: '颜色',
        type: 'color',
    },
    {
        key: 'font',
        label: '字体',
        type: 'font',
    },
];

function renderForm(onChange: (next: WidgetFlatProps) => void) {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const root = createRoot(container);

    act(() => {
        root.render(
            <WidgetDynamicForm
                value={{
                    text: 'hello',
                    fontSize: 24,
                    align: 'center',
                    color: '#ffffff',
                    font: 'normal normal 600 normal 24px/1.25 Arial, sans-serif',
                }}
                schema={schema}
                onChange={onChange}
            />
        );
    });

    return { container, root };
}

afterEach(() => {
    document.body.innerHTML = '';
});

beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

    class ResizeObserverMock {
        observe() { }
        unobserve() { }
        disconnect() { }
    }

    (globalThis as unknown as { ResizeObserver?: typeof ResizeObserverMock }).ResizeObserver = ResizeObserverMock;

    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
});

describe('WidgetDynamicForm', () => {
    it('renders controls by schema field type', () => {
        const { container, root } = renderForm(() => undefined);

        expect(container.textContent).toContain('文本');
        expect(container.textContent).toContain('字号');
        expect(container.textContent).toContain('对齐');
        expect(container.textContent).toContain('颜色');
        expect(container.textContent).toContain('字体');

        expect(container.querySelector('input')).toBeTruthy();
        expect(container.querySelector('.ant-input-number')).toBeTruthy();
        expect(container.querySelector('.ant-radio-group')).toBeTruthy();
        expect(container.querySelector('[class*=\'ant-color-picker\']')).toBeTruthy();
        expect(container.querySelector('[data-testid="font-picker-trigger"]')).toBeTruthy();

        act(() => {
            root.unmount();
        });
    });

    it('updates value when editing string input', () => {
        const onChange = vi.fn();
        const { container, root } = renderForm(onChange);

        const textInput = container.querySelector('textarea.ant-input');
        if (!(textInput instanceof HTMLTextAreaElement)) {
            throw new Error('text input not found');
        }

        act(() => {
            const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
            valueSetter?.call(textInput, 'new text');
            textInput.dispatchEvent(new Event('input', { bubbles: true }));
        });

        expect(onChange).toHaveBeenCalled();
        const nextValue = onChange.mock.calls.at(-1)?.[0] as WidgetFlatProps | undefined;
        expect(nextValue?.['text']).toBe('new text');

        act(() => {
            root.unmount();
        });
    });

    it('updates editor field value in draft change flow', () => {
        const onChange = vi.fn();

        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);

        const editorSchema: WidgetSettingsSchema = [
            {
                key: 'html',
                label: 'HTML 编辑器',
                type: 'editor',
                language: 'html',
            },
        ];

        act(() => {
            root.render(
                <WidgetDynamicForm
                    value={{ html: '<h1>hello</h1>' }}
                    schema={editorSchema}
                    onChange={onChange}
                />
            );
        });

        expect(container.querySelector('[data-testid="mock-ai-editor-panel"]')).toBeTruthy();
        expect(onChange).toHaveBeenCalled();

        act(() => {
            root.unmount();
        });
    });
});
