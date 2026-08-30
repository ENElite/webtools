import { readFileSync } from 'node:fs';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Alert, Badge, Button, Card, ContextMenu, Field, NumberInput, Select, Switch, TextInput } from './index';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver ??= class ResizeObserver {
    disconnect() {}
    observe() {}
    unobserve() {}
};

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

function dispatchPointer(
    element: Element | null | undefined,
    type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
    init: { pointerType: 'mouse' | 'touch'; clientX?: number; clientY?: number },
) {
    const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: init.clientX ?? 0,
        clientY: init.clientY ?? 0,
    });
    Object.defineProperty(event, 'pointerType', { value: init.pointerType });
    element?.dispatchEvent(event);
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

    it('mounts select options in the shared overlay layer when opened', async () => {
        const host = render(
            <Select
                aria-label='媒体来源'
                options={[
                    { value: 'bird-paper', label: '小鸟壁纸' },
                    { value: 'konachan', label: 'Konachan' },
                ]}
            />,
        );
        const trigger = host.querySelector<HTMLButtonElement>('.wt-select__trigger');
        expect(document.body.querySelector('.wt-select__content')).toBeNull();

        await act(async () => {
            trigger?.click();
            await new Promise((resolve) => setTimeout(resolve, 30));
        });

        expect(document.body.querySelector('.wt-select__content[data-state="open"]')).not.toBeNull();
        expect([...document.body.querySelectorAll('.wt-select__item')].map((item) => item.textContent)).toEqual([
            '小鸟壁纸✓',
            'Konachan✓',
        ]);
    });

    it('opens a context menu at the app surface', async () => {
        const host = render(
            <ContextMenu items={[{ value: 'settings', label: '壁纸设置' }]}>
                <main data-testid='surface'>画布</main>
            </ContextMenu>,
        );
        const surface = host.querySelector('[data-testid="surface"]');
        await act(async () => {
            surface?.dispatchEvent(new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                clientX: 20,
                clientY: 30,
            }));
            await new Promise((resolve) => setTimeout(resolve, 30));
        });

        const item = document.body.querySelector<HTMLElement>('.wt-menu__item');
        expect(item?.textContent).toContain('壁纸设置');
    });

    it('selects a context menu item through the Ark menu root', async () => {
        const onSelect = vi.fn();
        const host = render(
            <ContextMenu items={[{ value: 'settings', label: '壁纸设置', onSelect }]}>
                <main data-testid='surface'>画布</main>
            </ContextMenu>,
        );
        const surface = host.querySelector('[data-testid="surface"]');

        await act(async () => {
            surface?.dispatchEvent(new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                clientX: 20,
                clientY: 30,
            }));
            await new Promise((resolve) => setTimeout(resolve, 30));
        });
        await act(async () => {
            const item = document.body.querySelector<HTMLElement>('.wt-menu__item');
            dispatchPointer(item, 'pointerdown', { pointerType: 'mouse' });
            item?.click();
            await new Promise((resolve) => setTimeout(resolve, 30));
        });

        expect(onSelect).toHaveBeenCalledOnce();
    });

    it('opens and selects a true nested context submenu without selecting its parent', async () => {
        const onParentSelect = vi.fn();
        const onClockSelect = vi.fn();
        const host = render(
            <ContextMenu
                items={[{
                    value: 'add-widget',
                    label: '添加组件',
                    onSelect: onParentSelect,
                    items: [{ value: 'add-clock', label: '时钟', onSelect: onClockSelect }],
                }]}
            >
                <main data-testid='surface'>画布</main>
            </ContextMenu>,
        );
        const surface = host.querySelector('[data-testid="surface"]');

        await act(async () => {
            surface?.dispatchEvent(new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                clientX: 20,
                clientY: 30,
            }));
            await new Promise((resolve) => setTimeout(resolve, 30));
        });
        const submenuTrigger = document.body.querySelector<HTMLElement>('.wt-menu__item--submenu');
        await act(async () => {
            submenuTrigger?.click();
            await new Promise((resolve) => setTimeout(resolve, 250));
        });
        const openMenus = document.body.querySelectorAll('.wt-menu[data-state="open"]');
        expect(openMenus).toHaveLength(2);

        const submenuItem = openMenus[1]?.querySelector<HTMLElement>('.wt-menu__item');
        await act(async () => {
            dispatchPointer(submenuItem, 'pointerdown', { pointerType: 'mouse' });
            submenuItem?.click();
            await new Promise((resolve) => setTimeout(resolve, 30));
        });

        expect(onClockSelect).toHaveBeenCalledOnce();
        expect(onParentSelect).not.toHaveBeenCalled();
    });

    it('opens on the long-press threshold before pointerup and suppresses the following click', async () => {
        const onSurfaceClick = vi.fn();
        const onOpenChange = vi.fn();
        const host = render(
            <ContextMenu
                items={[{ value: 'settings', label: '壁纸设置' }]}
                longPressDelay={20}
                onOpenChange={onOpenChange}
            >
                <main data-testid='surface' onClick={onSurfaceClick}>画布</main>
            </ContextMenu>,
        );
        const surface = host.querySelector('[data-testid="surface"]');

        await act(async () => {
            dispatchPointer(surface, 'pointerdown', { pointerType: 'touch', clientX: 44, clientY: 56 });
            await new Promise((resolve) => setTimeout(resolve, 35));
        });

        expect(document.body.querySelector('.wt-menu[data-state="open"]')).not.toBeNull();
        expect(onOpenChange).toHaveBeenCalledWith(true);

        await act(async () => {
            dispatchPointer(surface, 'pointerup', { pointerType: 'touch', clientX: 44, clientY: 56 });
            surface?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        });
        expect(onSurfaceClick).not.toHaveBeenCalled();
        expect(document.body.querySelectorAll('.wt-menu[data-state="open"]')).toHaveLength(1);
    });

    it('clips number steppers inside the flat rounded input edge', () => {
        const styles = readFileSync('src/styles.css', 'utf8');
        const controlsRule = styles.match(/\.wt-number-input__controls\s*\{(?<body>[^}]+)\}/)?.groups?.['body'];
        const rootRule = styles.match(/\.wt-number-input\s*\{(?<body>[^}]+)\}/)?.groups?.['body'];

        expect(rootRule).toContain('border-radius: var(--wt-radius-md)');
        expect(controlsRule).toContain('inset-block: 2px');
        expect(controlsRule).toContain('inset-inline-end: 2px');
        expect(controlsRule).toContain('overflow: hidden');
    });
});
