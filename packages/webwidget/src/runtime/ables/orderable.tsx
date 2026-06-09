import type { Able, MoveableManagerInterface, Renderer } from 'react-moveable';
import { getPositionStyles, type Position } from './positionUtils';

type OrderableProps = {
    orderPosition?: Position;
    orderPadding?: number;
    order?: number;
};

export const Orderable: Able = {
    name: 'orderable',
    props: ['order', 'orderPosition', 'orderPadding'],
    events: [],
    render(moveable: MoveableManagerInterface<OrderableProps>, _React: Renderer) {
        const order = moveable.props.order ?? 0;
        const postion = moveable.props.orderPosition ?? 'top-left';
        const padding = moveable.props.orderPadding ?? 10;
        const styles = getPositionStyles(postion, moveable, { padding });

        return (
            <div
                key='order-viewer'
                className='moveable-order'
                style={{
                    ...styles,
                    background: 'white',
                    borderRadius: '4px',
                    padding: '4px 4px 1px 4px',
                    color: 'black',
                    fontSize: '12px',
                    lineHeight: '12px',
                    whiteSpace: 'nowrap',
                    fontWeight: 'bold',
                    willChange: 'transform',
                }}
            >
                Order: {order}
            </div>
        );
    },
};
