import type { WidgetRendererProps } from '../types';
import type { HtmlWidgetProps } from './schema';

export function HtmlWidget({ widget }: WidgetRendererProps<HtmlWidgetProps>) {
    const html = typeof widget.props.html === 'string' ? widget.props.html : '';
    const interactive = widget.locked === true;

    return (
        <iframe
            title='html widget'
            srcDoc={html}
            draggable={false}
            sandbox='allow-scripts'
            style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: 'transparent',
                pointerEvents: interactive ? 'auto' : 'none',
                userSelect: interactive ? 'auto' : 'none',
                touchAction: interactive ? 'auto' : 'none',
            }}
        />
    );
}