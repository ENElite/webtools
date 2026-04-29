import { VideoHero } from '@/features/display';
import type { WidgetRendererProps } from '../types';
import type { VideoWidgetProps } from './schema';

export function VideoWidget({ widget }: WidgetRendererProps<VideoWidgetProps>) {
    return (
        <VideoHero
            videoUrl={widget.props.videoUrl}
            posterUrl={widget.props.posterUrl || null}
            objectFit={widget.props.objectFit}
            onVideoError={() => undefined}
            onVideoEnded={() => undefined}
        />
    );
}