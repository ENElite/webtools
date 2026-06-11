import type { CSSProperties } from 'react';
import type { MoveableManagerInterface } from 'react-moveable';

// Position constants
const HorizontalKeys = ['left', 'right'] as const;
const VerticalKeys = ['top', 'bottom'] as const;
type Horizontal = typeof HorizontalKeys[number];
type Vertical = typeof VerticalKeys[number];
export type Position = `${Horizontal}-${Vertical}` | `${Vertical}-${Horizontal}`;

// Validate and normalize position string
function validPosition(pos: string): Position {
    const parts = pos.split('-');
    if (parts.length !== 2) return 'top-right';

    const [p1, p2] = parts;

    const horizontalFirst = HorizontalKeys.includes(p1 as Horizontal) && VerticalKeys.includes(p2 as Vertical);
    const verticalFirst = VerticalKeys.includes(p1 as Vertical) && HorizontalKeys.includes(p2 as Horizontal);

    if (horizontalFirst || verticalFirst) {
        return pos as Position;
    }

    return 'top-right';
}

// Options for position calculation
interface PositionOptions {
    padding?: number;
    inside?: boolean;
}

/**
 * Calculate the corner position based on position key
 * pos1: top-left, pos2: top-right, pos3: bottom-left, pos4: bottom-right
 */
function getCornerPos(state: { pos1: number[]; pos2: number[]; pos3: number[]; pos4: number[] }, isLeft: boolean, isTop: boolean): number[] {
    if (isTop && isLeft) return state.pos1;       // top-left
    if (isTop && !isLeft) return state.pos2;      // top-right
    if (!isTop && isLeft) return state.pos3;      // bottom-left
    return state.pos4;                            // bottom-right
}

/**
 * Calculate CSS position styles for an element relative to a rotated container
 * @param position - Position key like 'top-right', 'right-top'
 * @param moveable - MoveableManagerInterface instance
 * @param options - Options { padding, inside }
 * @returns CSSProperties with position styles
 */
export function getPositionStyles<T>(
    position: Position,
    moveable: MoveableManagerInterface<T>,
    options: PositionOptions = {}
): CSSProperties {
    const { padding = 10, inside = false } = options;
    const state = moveable.state;
    const rect = moveable.getRect();
    const [D1, D2] = validPosition(position).split('-') as [string, string];

    // Determine horizontal and vertical components
    let horizontal: Horizontal;
    let vertical: Vertical;
    let horizontalFirst: boolean;

    if (HorizontalKeys.includes(D1 as Horizontal)) {
        // horizontal-first: e.g., "left-top", "right-bottom"
        horizontal = D1 as Horizontal;
        vertical = D2 as Vertical;
        horizontalFirst = true;
    } else {
        // vertical-first: e.g., "top-left", "bottom-right"
        horizontal = D2 as Horizontal;
        vertical = D1 as Vertical;
        horizontalFirst = false;
    }

    const isLeft = horizontal === 'left';
    const isTop = vertical === 'top';

    // Get corner position (rotated coordinates from state)
    const cornerPos = getCornerPos(state, isLeft, isTop);

    // Calculate offset and alignment based on order
    let offsetX = 0;
    let offsetY = 0;
    let translateX = '0%';
    let translateY = '0%';

    if (horizontalFirst) {
        // Horizontal-first: 例如 left-top = 移动到左侧，对齐到上边沿
        if (inside) {
            offsetX = isLeft ? padding : -padding;
            offsetY = 0;
            translateX = isLeft ? '0%' : '-100%';
            translateY = isTop ? '0%' : '-100%';
        } else {
            offsetX = isLeft ? -padding : padding;
            offsetY = 0;
            translateX = isLeft ? '-100%' : '0%';
            translateY = isTop ? '0%' : '-100%';
        }
    } else {
        // Vertical-first: 例如 top-left = 移动到上方，左对齐
        if (inside) {
            offsetX = 0;
            offsetY = isTop ? padding : -padding;
            translateX = isLeft ? '0%' : '-100%';
            translateY = isTop ? '0%' : '-100%';
        } else {
            offsetX = 0;
            offsetY = isTop ? -padding : padding;
            translateX = isLeft ? '0%' : '-100%';
            translateY = isTop ? '-100%' : '0%';
        }
    }

    return {
        position: 'absolute',
        left: 0,
        top: 0,
        willChange: 'transform',
        transformOrigin: '0px 0px',
        transform: `
            translate(${cornerPos[0]}px, ${cornerPos[1]}px)
            rotate(${rect.rotation}deg)
            translate(${offsetX}px, ${offsetY}px)
            translate(${translateX}, ${translateY})
        `,
    };
}
