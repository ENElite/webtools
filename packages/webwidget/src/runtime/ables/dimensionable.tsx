import { Able, MoveableManagerInterface, Renderer } from 'react-moveable';
import { getPositionStyles, type Position } from './positionUtils';

type DimensionableProps = {
    dimensionPosition?: Position;
    dimensionPadding?: number;
};

export const Dimensionable: Able = {
    name: 'dimensionable',
    props: ['dimensionPosition', 'dimensionPadding'],
    events: [],
    render(moveable: MoveableManagerInterface<DimensionableProps>, _React: Renderer) {
        const position = moveable.props.dimensionPosition || 'top-right';
        const padding = moveable.props.dimensionPadding ?? 10;
        const styles = getPositionStyles(position, moveable, { padding });
        return (
            <div
                key='dimension-viewer'
                className='moveable-dimension'
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
                }}
            >
                {Math.round(moveable.state.offsetWidth)} x {Math.round(moveable.state.offsetHeight)}
            </div>
        );
    },
};
