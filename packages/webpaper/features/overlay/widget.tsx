import React from 'react';
import { useIdle } from '@reactuses/core';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';

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
    const backgroundColor = widget.style.backgroundColor ?? 'rgba(255, 255, 255, 0)';
    const backgroundEffect = widget.style.backgroundEffect ?? 'none';
    const backgroundImageUrl = widget.style.backgroundImageUrl ?? '';
    const borderColor = widget.style.borderColor ?? '#38bdf8';
    const borderWidth = widget.style.borderWidth ?? 0;
    const borderStyle = widget.style.borderStyle ?? 'solid';
    const shadowRadius = widget.style.shadowRadius ?? 0;
    const shadowColor = widget.style.shadowColor ?? 'rgba(0, 0, 0, 0.5)';

    const style: CSSProperties = {
        position: 'absolute',
        width: widget.style.width,
        height: widget.style.height,
        transform: widget.style.transform,
        transformOrigin: 'center center',
        borderRadius: widget.style.borderRadius,
        backgroundColor,
        borderColor,
        borderWidth,
        borderStyle: borderWidth > 0 ? mapBorderStyle(borderStyle) : 'none',
        boxShadow: shadowRadius > 0 ? `0 0 ${shadowRadius}px ${shadowColor}` : 'none',
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
    const isIdle = useIdle();

    if (widget.autoHide && isIdle) {
        return null;
    }

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