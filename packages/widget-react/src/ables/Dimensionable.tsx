import type { Able, MoveableManagerInterface, Renderer } from 'react-moveable';

import { getAblePosition } from './position';

interface DimensionableProps extends Record<string, unknown> {
    dimensionablePosition?: 'top-right';
    dimensionablePadding?: number;
}

export const Dimensionable: Able<DimensionableProps> = {
    name: 'dimensionable',
    props: ['dimensionablePosition', 'dimensionablePadding'],
    events: [],
    render(moveable: MoveableManagerInterface<DimensionableProps>, renderer: Renderer) {
        return renderer.createElement('output', {
            key: 'dimensionable',
            className: 'wt-widget-able wt-widget-able--dimension',
            style: getAblePosition(
                moveable.props.dimensionablePosition ?? 'top-right',
                moveable as MoveableManagerInterface<Record<string, unknown>>,
                { padding: moveable.props.dimensionablePadding ?? 8 },
            ),
            'aria-label': '组件尺寸',
        }, `${Math.round(moveable.state.offsetWidth)} × ${Math.round(moveable.state.offsetHeight)}`);
    },
};
