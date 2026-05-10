import { Able, MoveableManagerInterface, RectInfo, Renderer } from "react-moveable";

const HorizontalKeys = ['left', 'right'] as const;
const VerticalKeys = ['top', 'bottom'] as const;
type Horizontal = typeof HorizontalKeys[number];
type Vertical = typeof VerticalKeys[number];
type Position =
    | `${Horizontal}-${Vertical}`
    | `${Vertical}-${Horizontal}`;

function validPosition<T extends string>(pos: T): Position {
    const parts = pos.split('-');
    if (parts.length !== 2) return 'top-right';

    const [p1, p2] = parts;

    const horizontalFirst = HorizontalKeys.includes(p1 as Horizontal) && VerticalKeys.includes(p2 as Vertical);
    const verticalFirst = VerticalKeys.includes(p1 as Vertical) && HorizontalKeys.includes(p2 as Horizontal);

    if (horizontalFirst || verticalFirst) {
        return pos as Position; // TS 断言 pos 合法
    }

    return 'top-right';
}

function makeDirectionStyles(rect: RectInfo, position: Position = 'top-right', padding: number = 10): React.CSSProperties {
    const [D1, D2] = validPosition(position).split('-') as [string, string];
    if (HorizontalKeys.includes(D1 as Horizontal) && VerticalKeys.includes(D2 as Vertical)) {
        // 先左右，后上下
        return {
            left: D1 === 'left' ? -padding : rect.offsetWidth + padding,
            top: D2 === 'top' ? 0 : rect.offsetHeight,
            transform: `translate(${D1 === 'left' ? '-100%' : '0'}, ${D2 === 'top' ? '-100%' : '0'})`,
        };
    }
    if (HorizontalKeys.includes(D2 as Horizontal) && VerticalKeys.includes(D1 as Vertical)) {
        // 先上下，后左右
        return {
            top: D1 === 'top' ? -padding : rect.offsetHeight + padding,
            left: D2 === 'left' ? 0 : rect.offsetWidth,
            transform: `translate(${D2 === 'left' ? '0' : '-100%'}, ${D1 === 'top' ? '-100%' : '0'})`,
        };
    }
    return {} as never;
}

type DimensionableProps = {
    dimensionPosition?: Position;
    dimensionPadding?: number;
};

export const Dimensionable: Able = {
    name: "dimensionable",
    props: ['dimensionPosition', 'dimensionPadding'],
    events: [],
    render(moveable: MoveableManagerInterface<DimensionableProps>, React: Renderer) {
        const rect = moveable.getRect();
        const position = moveable.props.dimensionPosition;
        const padding = moveable.props.dimensionPadding;
        const styles = makeDirectionStyles(rect, position, padding);
        return <div key={"dimension-viewer"} className={"moveable-dimension"} style={{
            position: "absolute",
            ...styles,
            background: "white",
            borderRadius: "4px",
            padding: "4px 4px 1px 4px",
            color: "black",
            fontSize: "12px",
            lineHeight: "12px",
            whiteSpace: "nowrap",
            fontWeight: "bold",
            willChange: "transform",
        }}>
            {Math.round(rect.offsetWidth)} x {Math.round(rect.offsetHeight)}
        </div>;
    },
};