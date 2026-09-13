import type { Able, MoveableManagerInterface, Renderer } from 'react-moveable';

import { getAblePosition } from './position';

interface OrderableProps extends Record<string, unknown> {
    orderablePosition?: 'top-left';
    orderablePadding?: number;
    widgetOrder?: number;
}

export const Orderable: Able<OrderableProps> = {
    name: 'orderable',
    props: ['orderablePosition', 'orderablePadding', 'widgetOrder'],
    events: [],
    render(moveable: MoveableManagerInterface<OrderableProps>, renderer: Renderer) {
        return renderer.createElement('output', {
            key: 'orderable',
            className: 'wt-widget-able wt-widget-able--order',
            style: getAblePosition(
                moveable.props.orderablePosition ?? 'top-left',
                moveable as MoveableManagerInterface<Record<string, unknown>>,
                { padding: moveable.props.orderablePadding ?? 8 },
            ),
            'aria-label': '组件层级',
        }, `第 ${Number(moveable.props.widgetOrder ?? 1)} 层`);
    },
};
