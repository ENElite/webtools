import type { CSSProperties, MouseEvent, ReactNode } from 'react';

import type { WidgetModel } from './types';
import { DEFAULT_WIDGET_COMMON_PROPS } from './settings/common';

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
    onDoubleClick?: () => void;
    onContextMenu?: (event: MouseEvent<HTMLDivElement>) => void;
};

function mapBorderStyle(value: string): CSSProperties['borderStyle'] {
    if (value === 'dot') {
        return 'dotted';
    }

    if (value === 'dash' || value === 'dotdash') {
        return 'dashed';
    }

    return 'solid';
}

function buildWidgetVisualStyle(widget: WidgetModel): CSSProperties {
    const props = widget.props;
    const backgroundColor = typeof props['backgroundColor'] === 'string'
        ? props['backgroundColor']
        : DEFAULT_WIDGET_COMMON_PROPS.backgroundColor;
    const backgroundEffect = typeof props['backgroundEffect'] === 'string'
        ? props['backgroundEffect']
        : DEFAULT_WIDGET_COMMON_PROPS.backgroundEffect;
    const backgroundImageUrl = typeof props['backgroundImageUrl'] === 'string'
        ? props['backgroundImageUrl']
        : DEFAULT_WIDGET_COMMON_PROPS.backgroundImageUrl;
    const borderColor = typeof props['borderColor'] === 'string'
        ? props['borderColor']
        : DEFAULT_WIDGET_COMMON_PROPS.borderColor;
    const borderWidth = typeof props['borderWidth'] === 'number'
        ? props['borderWidth']
        : DEFAULT_WIDGET_COMMON_PROPS.borderWidth;
    const borderStyle = typeof props['borderStyle'] === 'string'
        ? props['borderStyle']
        : DEFAULT_WIDGET_COMMON_PROPS.borderStyle;

    const style: CSSProperties = {
        // Widget attributes
        position: 'absolute',
        width: widget.style.width,
        height: widget.style.height,
        transform: widget.style.transform,
        transformOrigin: 'center center',
        // Widget visual styles
        backgroundColor,
        borderColor,
        borderWidth,
        borderStyle: borderWidth > 0 ? mapBorderStyle(borderStyle) : 'none',
        overflow: 'hidden',
    };

    if (backgroundEffect === 'blur') {
        style.backdropFilter = 'blur(8px)';
    }

    if (backgroundEffect === 'image' && backgroundImageUrl) {
        style.backgroundImage = `url(${backgroundImageUrl})`;
        style.backgroundSize = 'cover';
        style.backgroundPosition = 'center';
        style.backgroundRepeat = 'no-repeat';
    }

    return style;
}

export function Widget({
    children,
    widget,
    active = false,
    className,
    style,
    rootRef,
    onClick,
    onDoubleClick,
    onContextMenu,
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
            onDoubleClick={onDoubleClick}
            onAuxClick={onClick}
            onContextMenu={onContextMenu}
            style={{
                ...buildWidgetVisualStyle(widget),
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
