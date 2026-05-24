import type { WidgetRendererProps } from '../../engine/model';
import type { IframeWidgetProps } from './schema';

export function IframeWidget({ widget }: WidgetRendererProps<IframeWidgetProps>) {
    const url = typeof widget.props.url === 'string' ? widget.props.url.trim() : '';
    const sandbox = typeof widget.props.sandbox === 'string' && widget.props.sandbox.trim().length > 0
        ? widget.props.sandbox.trim()
        : undefined;
    const interactive = widget.locked === true;

    return (
        <iframe
            title='iframe widget'
            src={url}
            draggable={false}
            sandbox={sandbox}
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