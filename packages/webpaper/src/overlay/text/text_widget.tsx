import type { CSSProperties } from 'react';

import type { WidgetRendererProps } from '../types';
import type { TextWidgetProps } from './schema';

export function TextWidget({ widget }: WidgetRendererProps<TextWidgetProps>) {
    const style: CSSProperties = {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: widget.props.align === 'left' ? 'flex-start' : widget.props.align === 'right' ? 'flex-end' : 'center',
        color: widget.props.color,
        fontSize: `${widget.props.fontSize}px`,
        fontWeight: widget.props.fontWeight,
        lineHeight: 1.25,
        padding: '12px 16px',
        textAlign: widget.props.align,
    };

    return (
        <div data-testid='overlay-text-widget' style={style}>
            {widget.props.text}
        </div>
    );
}
