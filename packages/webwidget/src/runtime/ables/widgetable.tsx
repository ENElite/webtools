import { Button, Space } from 'antd';
import { Icon } from '@iconify/react';
import type { Able, MoveableManagerInterface, Renderer } from 'react-moveable';
export type WidgetableButtonType =
    | 'move-widget-up'
    | 'move-widget-down'
    | 'move-widget-to-top'
    | 'move-widget-to-bottom'
    | 'reset-widget-rotation'
    | 'toggle-widget-lock'
    | 'copy-widget'
    | 'remove-widget'
    | 'open-widget-settings';

type WidgetableProps = {
    locked: boolean;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onWidgetableClicked?: (type: WidgetableButtonType) => void;
};

const WIDGETABLE_BUTTONS: Array<{ type: WidgetableButtonType; title: string; iconId: string; enabled: boolean }> = [
    { type: 'move-widget-up', title: '上移一层', iconId: 'octicon:chevron-up-16', enabled: true },
    { type: 'move-widget-down', title: '下移一层', iconId: 'octicon:chevron-down-16', enabled: true },
    { type: 'move-widget-to-top', title: '置顶', iconId: 'octicon:move-to-top-16', enabled: true },
    { type: 'move-widget-to-bottom', title: '置底', iconId: 'octicon:move-to-bottom-16', enabled: true },
    { type: 'reset-widget-rotation', title: '复位旋转', iconId: 'octicon:sync-16', enabled: true },
    { type: 'toggle-widget-lock', title: '锁定/解锁', iconId: 'octicon:lock-16', enabled: true },
    { type: 'copy-widget', title: '复制', iconId: 'octicon:duplicate-16', enabled: true },
    { type: 'remove-widget', title: '删除', iconId: 'octicon:trash-16', enabled: true },
    { type: 'open-widget-settings', title: '设置', iconId: 'octicon:gear-16', enabled: true },
];

export const Widgetable = {
    name: 'widgetable',
    props: ['locked', 'onWidgetableMouseEnter', 'onWidgetableMouseLeave', 'onWidgetableClicked'],
    events: [],
    render(moveable: MoveableManagerInterface<WidgetableProps>, _: Renderer) {
        const onWidgetableClicked = moveable.props.onWidgetableClicked;
        const onMouseEnter = moveable.props.onMouseEnter;
        const onMouseLeave = moveable.props.onMouseLeave;
        const locked = moveable.props.locked;
        const WidgetableViewer = moveable.useCSS('div', `
            {
                position: absolute;
                left: 0px;
                top: 0px;
                will-change: transform;
                transform-origin: 0px 0px;
            }
            .widgetable-button {
                background-color: white;
                color: black;
            }
        `);
        const buttons = WIDGETABLE_BUTTONS.map((button) => {
            if (button.type === 'toggle-widget-lock') {
                return {
                    ...button,
                    title: locked ? '解锁' : '锁定',
                    iconId: locked ? 'octicon:lock-16' : 'octicon:unlock-16',
                };
            }

            return button;
        });

        const rect = moveable.getRect();
        const { pos3: pos } = moveable.state;
        return <WidgetableViewer key={"widgetable-viewer"} className='widgetable-viewer' style={{
            transform: `translate(${pos[0]}px, ${pos[1]}px) rotate(${rect.rotation}deg) translate(0px, 10px)`,
        }} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            <Space.Compact key={"widgetable-buttons"}>
                {buttons.map(({ type, title, iconId }) => (
                    <Button
                        key={type}
                        size="small"
                        type="primary"
                        title={title}
                        onClick={() => onWidgetableClicked?.(type)}
                        className='widgetable-button'
                    >
                        <Icon icon={iconId} width={16} height={16} aria-hidden />
                    </Button>
                ))}
            </Space.Compact>
        </WidgetableViewer>
    },
} as Able;