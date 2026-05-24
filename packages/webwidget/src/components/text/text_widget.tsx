import type { CSSProperties } from 'react';

import type { WidgetRendererProps } from '../../engine/model';
import type { TextWidgetProps } from './schema';

export function TextWidget({ widget }: WidgetRendererProps<TextWidgetProps>) {
    const textShadow = widget.props.textShadowRadius > 0
        ? `0 0 ${widget.props.textShadowRadius}px ${widget.props.textShadowColor}`
        : 'none';

    const style: CSSProperties = {
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
    };

    return (
        <div data-testid='overlay-text-widget' style={style}>
            {widget.props.text}
        </div>
    );
}