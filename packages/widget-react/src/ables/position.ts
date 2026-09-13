import type { CSSProperties } from 'react';
import type { MoveableManagerInterface } from 'react-moveable';

type Horizontal = 'left' | 'right';
type Vertical = 'top' | 'bottom';
export type AblePosition = `${Horizontal}-${Vertical}` | `${Vertical}-${Horizontal}`;

interface PositionOptions {
    readonly padding?: number;
    readonly inside?: boolean;
}

/** Positions custom Moveable UI against a rotated corner in the target coordinate system. */
export function getAblePosition(
    position: AblePosition,
    moveable: MoveableManagerInterface<Record<string, unknown>>,
    { padding = 8, inside = false }: PositionOptions = {},
): CSSProperties {
    const [first, second] = position.split('-') as [Horizontal | Vertical, Horizontal | Vertical];
    const horizontalFirst = first === 'left' || first === 'right';
    const horizontal = (horizontalFirst ? first : second) as Horizontal;
    const vertical = (horizontalFirst ? second : first) as Vertical;
    const left = horizontal === 'left';
    const top = vertical === 'top';
    const state = moveable.state;
    const corner = top ? (left ? state.pos1 : state.pos2) : (left ? state.pos3 : state.pos4);
    const rotation = moveable.getRect().rotation;

    let offsetX = 0;
    let offsetY = 0;
    let translateX = '0%';
    let translateY = '0%';

    if (horizontalFirst) {
        offsetX = left ? (inside ? padding : -padding) : (inside ? -padding : padding);
        translateX = left ? (inside ? '0%' : '-100%') : (inside ? '-100%' : '0%');
        translateY = top ? '0%' : '-100%';
    } else {
        offsetY = top ? (inside ? padding : -padding) : (inside ? -padding : padding);
        translateX = left ? '0%' : '-100%';
        translateY = top ? (inside ? '0%' : '-100%') : (inside ? '-100%' : '0%');
    }

    return {
        position: 'absolute',
        left: 0,
        top: 0,
        transform: [
            `translate(${corner[0]}px, ${corner[1]}px)`,
            `rotate(${rotation}deg)`,
            `translate(${offsetX}px, ${offsetY}px)`,
            `translate(${translateX}, ${translateY})`,
        ].join(' '),
        transformOrigin: '0 0',
        willChange: 'transform',
    };
}
