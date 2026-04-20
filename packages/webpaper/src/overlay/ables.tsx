import { Button, Space } from 'antd';
import type { MoveableManagerInterface, Renderer } from 'react-moveable';
type WidgetableProps = {
    locked: boolean;
    onWidgetableClicked?: (type: string) => void;
};
export const Widgetable = {
    name: 'widgetable',
    props: ['locked', 'onWidgetableClicked'],
    events: [],
    render(moveable: MoveableManagerInterface<WidgetableProps>, _: Renderer) {
        const onWidgetableClicked = moveable.props.onWidgetableClicked;
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
        const buttons = [
            { type: 'move-widget-up', title: '上移一层', iconClass: 'icon-[octicon--chevron-up-16]' },
            { type: 'move-widget-down', title: '下移一层', iconClass: 'icon-[octicon--chevron-down-16]' },
            { type: 'move-widget-to-top', title: '置顶', iconClass: 'icon-[octicon--move-to-top-16]' },
            { type: 'move-widget-to-bottom', title: '置底', iconClass: 'icon-[octicon--move-to-bottom-16]' },
            { type: 'reset-widget-rotation', title: '复位旋转', iconClass: 'icon-[octicon--sync-16]' },
            { type: 'toggle-widget-lock', title: locked ? '解锁' : '锁定', iconClass: locked ? 'icon-[octicon--lock-16]' : 'icon-[octicon--unlock-16]' },
            { type: 'copy-widget', title: '复制', iconClass: 'icon-[octicon--duplicate-16]' },
            { type: 'remove-widget', title: '删除', iconClass: 'icon-[octicon--trash-16]' },
            { type: 'open-widget-settings', title: '设置', iconClass: 'icon-[octicon--gear-16]' },
        ]

        const rect = moveable.getRect();
        const { pos3: pos } = moveable.state;
        return <WidgetableViewer key={"widgetable-viewer"} className='widgetable-viewer' style={{
            transform: `translate(${pos[0]}px, ${pos[1]}px) rotate(${rect.rotation}deg) translate(0px, 10px)`,
        }}>
            <Space.Compact key={"widgetable-buttons"}>
                {buttons.map(({ type, title, iconClass }) => (
                    <Button
                        key={type}
                        size="small"
                        type="primary"
                        title={title}
                        onClick={() => onWidgetableClicked?.(type)}
                        className='widgetable-button'
                    >
                        <span aria-hidden='true' className={`inline-block h-4 w-4 ${iconClass}`} />
                    </Button>
                ))}
            </Space.Compact>
        </WidgetableViewer>
    },
} as const;
