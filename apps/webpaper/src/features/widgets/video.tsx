import { defineWidgetPlugin } from '@webtools/widget-core';
import { defineWidgetView } from '@webtools/widget-react';
import type { WidgetInspectorDefinition } from '@webtools/widget-studio';
import { z } from 'zod';

export const videoWidgetPropsSchema = z.object({
    src: z.string().min(1),
    poster: z.string(),
    objectFit: z.enum(['contain', 'cover', 'fill', 'none', 'scale-down']),
    autoPlay: z.boolean(),
    muted: z.boolean(),
    loop: z.boolean(),
    controls: z.boolean(),
}).strict();

export type VideoWidgetProps = z.infer<typeof videoWidgetPropsSchema>;

export const videoWidgetDefinition = defineWidgetPlugin({
    kind: 'video',
    label: '视频',
    propsSchema: videoWidgetPropsSchema,
    defaultProps: {
        src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        poster: '',
        objectFit: 'cover',
        autoPlay: true,
        muted: true,
        loop: true,
        controls: false,
    },
});

export const videoWidgetView = defineWidgetView<VideoWidgetProps>({
    kind: 'video',
    View: ({ widget }) => (
        <video
            src={widget.props.src}
            poster={widget.props.poster || undefined}
            autoPlay={widget.props.autoPlay}
            muted={widget.props.muted}
            loop={widget.props.loop}
            controls={widget.props.controls}
            playsInline
            preload='metadata'
            style={{
                display: 'block',
                height: '100%',
                objectFit: widget.props.objectFit,
                pointerEvents: widget.props.controls ? 'auto' : 'none',
                width: '100%',
            }}
        />
    ),
});

export const videoWidgetInspector: WidgetInspectorDefinition = {
    kind: 'video',
    schema: {
        pages: [{ key: 'source', label: '视频' }, { key: 'playback', label: '播放' }],
        fields: [
            { key: 'src', label: '视频地址', path: 'props.src', control: 'string', page: 'source', order: 100 },
            { key: 'poster', label: '封面地址', path: 'props.poster', control: 'string', page: 'source', order: 200 },
            {
                key: 'objectFit', label: '缩放方式', path: 'props.objectFit', control: 'enum', page: 'source', order: 300,
                options: [
                    { label: '裁切填充', value: 'cover' },
                    { label: '完整显示', value: 'contain' },
                    { label: '拉伸', value: 'fill' },
                    { label: '原尺寸', value: 'none' },
                    { label: '自适应', value: 'scale-down' },
                ],
            },
            { key: 'autoPlay', label: '自动播放', path: 'props.autoPlay', control: 'boolean', page: 'playback', order: 100 },
            { key: 'muted', label: '静音', path: 'props.muted', control: 'boolean', page: 'playback', order: 200 },
            { key: 'loop', label: '循环', path: 'props.loop', control: 'boolean', page: 'playback', order: 300 },
            { key: 'controls', label: '原生控件', path: 'props.controls', control: 'boolean', page: 'playback', order: 400 },
        ],
    },
};
