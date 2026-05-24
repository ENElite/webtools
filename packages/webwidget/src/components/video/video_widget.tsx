import type { WidgetRendererProps } from '../../engine/model';
import type { VideoWidgetProps } from './schema';

export function VideoWidget({ widget }: WidgetRendererProps<VideoWidgetProps>) {
    return (
        <video
            src={widget.props.videoUrl}
            poster={widget.props.posterUrl || undefined}
            controls
            preload='metadata'
            style={{
                width: '100%',
                height: '100%',
                objectFit: widget.props.objectFit,
                display: 'block',
            }}
        />
    );
}