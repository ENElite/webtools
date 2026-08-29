import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Alert, Badge, Button, Card, Field, NumberInput, Select, Switch, TextInput } from './index';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: ReturnType<typeof createRoot> | null = null;

afterEach(() => {
    act(() => root?.unmount());
    root = null;
});

function render(node: React.ReactNode) {
    const host = document.createElement('div');
    root = createRoot(host);
    act(() => root?.render(node));
    return host;
}

describe('Mochi primitives', () => {
    it('forwards native button behavior and Mochi variants', () => {
        const onClick = vi.fn();
        const host = render(
            <Button variant='soft' size='sm' onClick={onClick}>
                保存
            </Button>,
        );
        const button = host.querySelector('button');

        expect(button?.dataset['variant']).toBe('soft');
        expect(button?.dataset['size']).toBe('sm');
        button?.click();
        expect(onClick).toHaveBeenCalledOnce();
    });

    it('keeps loading buttons disabled and accessible', () => {
        const host = render(<Button loading>加载</Button>);
        const button = host.querySelector('button');

        expect(button?.disabled).toBe(true);
        expect(button?.getAttribute('aria-busy')).toBe('true');
    });

    it('forwards DOM props for surfaces and inputs', () => {
        const host = render(
            <Card data-testid='surface'>
                <Badge tone='accent'>新</Badge>
                <Alert tone='warning' title='提醒'>
                    请检查输入
                </Alert>
                <TextInput aria-label='名称' defaultValue='小鸟壁纸' />
            </Card>,
        );

        expect(host.querySelector('[data-testid="surface"]')).not.toBeNull();
        expect(host.querySelector('.wt-badge')?.getAttribute('data-tone')).toBe('accent');
        expect(host.querySelector('[role="status"]')).not.toBeNull();
        expect((host.querySelector('input') as HTMLInputElement).value).toBe('小鸟壁纸');
    });

    it('associates field labels with native and Ark controls', () => {
        const host = render(
            <>
                <Field label='关键词'><TextInput /></Field>
                <Field label='每页数量' description='最多五十张'><NumberInput /></Field>
                <Field label='媒体来源'>
                    <Select
                        name='source'
                        value='bird-paper'
                        options={[{ value: 'bird-paper', label: '小鸟壁纸' }]}
                    />
                </Field>
            </>,
        );
        const labels = [...host.querySelectorAll('label')];

        expect(labels).toHaveLength(3);
        for (const label of labels) {
            const controlId = label.htmlFor;
            expect(controlId).not.toBe('');
            expect([...host.querySelectorAll('[id]')].some((element) => element.id === controlId)).toBe(true);
        }
        const numberInput = host.querySelector('[role="spinbutton"]');
        const describedBy = numberInput?.getAttribute('aria-describedby');
        expect(describedBy).toBeTruthy();
        expect([...host.querySelectorAll('[id]')].some((element) => element.id === describedBy)).toBe(true);
        expect((host.querySelector('input[name="source"]') as HTMLInputElement).value).toBe('bird-paper');
    });

    it('puts an explicit switch label on the real input', () => {
        const host = render(<Switch aria-label='自动切换' />);
        expect(host.querySelector('input')?.getAttribute('aria-label')).toBe('自动切换');
    });
});
