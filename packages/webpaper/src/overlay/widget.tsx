import type { CSSProperties, ReactNode } from 'react';

import type { WidgetModel } from './types';

function combineClassNames(...names: Array<string | undefined | false>) {
    return names.filter(Boolean).join(' ');
}

type WidgetProps = {
    children?: ReactNode;
    widget: WidgetModel;
    active?: boolean;
    className?: string;
    style?: CSSProperties;
    rootRef?: (element: HTMLDivElement | null) => void;
    onClick?: () => void;
};

const makeStyle = (style: WidgetModel['style']): CSSProperties => ({
    position: 'absolute',
    width: style.width,
    height: style.height,
    transform: style.transform,
    transformOrigin: 'center center',
});

export function Widget({
    children,
    widget,
    active = false,
    className,
    style,
    rootRef,
    onClick,
}: WidgetProps) {
    return (
        <div
            className={combineClassNames(
                'widget group absolute left-0 top-0',
                active ? 'ring-2 ring-cyan-400/70' : undefined,
                widget.locked ? 'opacity-95' : undefined,
                className,
            )}
            ref={rootRef}
            onClick={onClick}
            style={{
                ...makeStyle(widget.style),
                ...style,
                touchAction: 'none',
                userSelect: 'none',
            }}
        >
            <div style={{ width: '100%', height: '100%' }}>
                {children}
            </div>
        </div>
    );
}
