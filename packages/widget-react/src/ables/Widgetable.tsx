import type { Able, MoveableManagerInterface, Renderer } from 'react-moveable';

import { getAblePosition } from './position';

export type WidgetableAction =
    | 'move-up'
    | 'move-down'
    | 'move-top'
    | 'move-bottom'
    | 'reset-rotation'
    | 'toggle-lock'
    | 'copy'
    | 'remove'
    | 'settings';

interface WidgetableProps extends Record<string, unknown> {
    widgetablePosition?: 'bottom-left';
    widgetablePadding?: number;
    widgetLocked?: boolean;
    onWidgetableAction?: (action: WidgetableAction) => void;
}

const ACTIONS: ReadonlyArray<{
    readonly action: WidgetableAction;
    readonly label: string;
    readonly glyph: string;
}> = [
    { action: 'move-up', label: '上移一层', glyph: '↑' },
    { action: 'move-down', label: '下移一层', glyph: '↓' },
    { action: 'move-top', label: '置于顶层', glyph: '⇈' },
    { action: 'move-bottom', label: '置于底层', glyph: '⇊' },
    { action: 'reset-rotation', label: '复位旋转', glyph: '↻' },
    { action: 'toggle-lock', label: '锁定组件', glyph: '◇' },
    { action: 'copy', label: '复制组件', glyph: '⧉' },
    { action: 'remove', label: '删除组件', glyph: '×' },
    { action: 'settings', label: '编辑设置', glyph: '⚙' },
];

export const Widgetable: Able<WidgetableProps> = {
    name: 'widgetable',
    props: [
        'widgetablePosition',
        'widgetablePadding',
        'widgetLocked',
        'onWidgetableAction',
    ],
    events: [],
    render(moveable: MoveableManagerInterface<WidgetableProps>, renderer: Renderer) {
        const locked = Boolean(moveable.props.widgetLocked);
        const actionHandler = moveable.props.onWidgetableAction;
        const style = getAblePosition(
            moveable.props.widgetablePosition ?? 'bottom-left',
            moveable as MoveableManagerInterface<Record<string, unknown>>,
            { padding: moveable.props.widgetablePadding ?? 8 },
        );

        return renderer.createElement(
            'div',
            {
                key: 'widgetable',
                className: 'wt-widget-able wt-widget-able--actions',
                style,
                role: 'toolbar',
                'aria-label': '组件快捷操作',
                onPointerDown: (event: PointerEvent) => event.stopPropagation(),
            },
            ...ACTIONS.map(({ action, label, glyph }) => renderer.createElement(
                'button',
                {
                    key: action,
                    type: 'button',
                    title: action === 'toggle-lock' ? (locked ? '解锁组件' : label) : label,
                    'aria-label': action === 'toggle-lock' ? (locked ? '解锁组件' : label) : label,
                    className: 'wt-widget-able__button',
                    'data-action': action,
                    onClick: (event: MouseEvent) => {
                        event.preventDefault();
                        event.stopPropagation();
                        actionHandler?.(action);
                    },
                },
                action === 'toggle-lock' ? (locked ? '●' : glyph) : glyph,
            )),
        );
    },
};
