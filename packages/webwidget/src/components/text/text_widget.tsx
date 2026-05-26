import type { CSSProperties, ReactNode } from 'react';

import type { WidgetRendererProps } from '../../engine/model';
import type { TextWidgetProps } from './schema';
import { MarqueeText } from './MarqueeText';

const GRID_AREA: CSSProperties = { gridArea: '1 / 1' };

function DualLayerText({
    children,
    normalStyle,
    strokeWidth,
    strokeColor,
}: {
    children: ReactNode;
    normalStyle: CSSProperties;
    strokeWidth: number;
    strokeColor: string;
}) {
    if (strokeWidth <= 0) {
        return <>{children}</>;
    }

    const shared: CSSProperties = {
        ...normalStyle,
        ...GRID_AREA,
    };

    const strokeStyle: CSSProperties = {
        ...shared,
        color: 'transparent',
        WebkitTextStroke: `${strokeWidth}px ${strokeColor}`,
        textShadow: 'none',
    };

    const normalStyleWithZ: CSSProperties = {
        ...shared,
        position: 'relative',
    };

    return (
        <div style={{ display: 'inline-grid', ...GRID_AREA, width: '100%', height: '100%' }}>
            <div style={strokeStyle}>{children}</div>
            <div style={normalStyleWithZ}>{children}</div>
        </div>
    );
}

export function TextWidget({ widget }: WidgetRendererProps<TextWidgetProps>) {
    const textShadow = widget.props.textShadowRadius > 0
        ? `0 0 ${widget.props.textShadowRadius}px ${widget.props.textShadowColor}`
        : 'none';

    const baseStyle: CSSProperties = {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: widget.props.align === 'left' ? 'flex-start' : widget.props.align === 'right' ? 'flex-end' : 'center',
        color: widget.props.color,
        font: widget.props.font,
        padding: '12px 16px',
        textAlign: widget.props.align,
        textShadow,
        whiteSpace: 'pre',
    };

    const textContent = (
        <DualLayerText
            normalStyle={baseStyle}
            strokeWidth={widget.props.strokeWidth}
            strokeColor={widget.props.strokeColor}
        >
            {widget.props.text}
        </DualLayerText>
    );

    if (widget.props.marquee) {

        return (
            <div data-testid='overlay-text-widget' style={{ position: 'relative', width: '100%', height: '100%' }}>
                <MarqueeText
                    speed={widget.props.marqueeSpeed}
                    direction={widget.props.marqueeDirection}
                    gap={50}
                    style={{ position: 'absolute', inset: 0, ...baseStyle }}
                >
                    {textContent}
                </MarqueeText>
            </div>
        );
    }

    return (
        <div data-testid='overlay-text-widget' style={baseStyle}>
            {textContent}
        </div>
    );
}
