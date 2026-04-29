import { ImageHero } from '@/features/display';
import type { WidgetRendererProps } from '../types';
import type { ImageWidgetProps } from './schema';

export function ImageWidget({ widget }: WidgetRendererProps<ImageWidgetProps>) {
    const mode = widget.props.mode;
    const objectFit = widget.props.objectFit;

    return (
        <ImageHero
            imageUrl={widget.props.imageUrl}
            previewUrl={widget.props.previewUrl || null}
            mode={mode}
            objectFit={objectFit}
            trackScale={widget.props.trackScale}
            trackIntensity={widget.props.trackIntensity}
            enableMouseTracking={widget.props.enableMouseTracking}
            onImageError={() => undefined}
        />
    );
}