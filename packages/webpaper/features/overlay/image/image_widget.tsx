import type { WidgetRendererProps } from '../types';
import type { ImageWidgetProps } from './schema';

export function ImageWidget({ widget }: WidgetRendererProps<ImageWidgetProps>) {
    return (
        <img
            src={widget.props.imageUrl}
            alt="Image Widget"
            style={{
                width: '100%',
                height: '100%',
                objectFit: widget.props.objectFit,
            }}
        />
    );
}