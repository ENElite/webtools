import type { WidgetSettingsSchema } from '../settings/schema';

export type VideoWidgetProps = {
    videoUrl: string;
    posterUrl: string;
    objectFit: 'contain' | 'cover';
};

const DEFAULT_VIDEO_POSTER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="%230f172a"/><stop offset="1" stop-color="%231e293b"/></linearGradient></defs><rect width="1200" height="800" fill="url(%23g)"/><circle cx="600" cy="400" r="132" fill="rgba(255,255,255,0.14)"/><path d="M560 340 L700 400 L560 460 Z" fill="white"/><text x="80" y="130" font-family="ui-sans-serif, system-ui" font-size="72" font-weight="700" fill="white">Video Widget</text><text x="80" y="205" font-family="ui-sans-serif, system-ui" font-size="34" fill="rgba(255,255,255,0.8)">Replace the source in the widget settings</text></svg>';

export const DEFAULT_VIDEO_WIDGET_PROPS: VideoWidgetProps = {
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    posterUrl: DEFAULT_VIDEO_POSTER,
    objectFit: 'cover',
};

export const VIDEO_WIDGET_SETTINGS_SCHEMA = [
    {
        key: 'videoUrl',
        label: '视频地址',
        type: 'string',
        placeholder: '输入 video URL',
    },
    {
        key: 'posterUrl',
        label: '封面地址',
        type: 'string',
        placeholder: '可选：输入 poster URL',
    },
    {
        key: 'objectFit',
        label: '裁切方式',
        type: 'enum',
        options: [
            { label: 'Cover', value: 'cover' },
            { label: 'Contain', value: 'contain' },
        ],
    },
] satisfies WidgetSettingsSchema<VideoWidgetProps>;