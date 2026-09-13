import { defineWidgetPlugin } from '@webtools/widget-core';
import { defineWidgetView } from '@webtools/widget-react';
import type { WidgetInspectorDefinition } from '@webtools/widget-studio';
import { z } from 'zod';

const DEFAULT_IMAGE = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1200 800%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x2=%221%22 y2=%221%22%3E%3Cstop stop-color=%22%230ea5e9%22/%3E%3Cstop offset=%221%22 stop-color=%22%237c3aed%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=%221200%22 height=%22800%22 fill=%22url(%23g)%22/%3E%3C/svg%3E';

export const imageWidgetPropsSchema = z.object({
    src: z.string().min(1),
    alt: z.string(),
    objectFit: z.enum(['contain', 'cover', 'fill', 'none', 'scale-down']),
    objectPosition: z.string().min(1),
}).strict();

export type ImageWidgetProps = z.infer<typeof imageWidgetPropsSchema>;

export const imageWidgetDefinition = defineWidgetPlugin({
    kind: 'image',
    label: '图片',
    propsSchema: imageWidgetPropsSchema,
    defaultProps: {
        src: DEFAULT_IMAGE,
        alt: '',
        objectFit: 'cover',
        objectPosition: 'center',
    },
});

export const imageWidgetView = defineWidgetView<ImageWidgetProps>({
    kind: 'image',
    readinessKey: ({ props }) => `image:${props.src}`,
    View: ({ widget, onError, onProgress, onReady }) => (
        <img
            src={widget.props.src}
            alt={widget.props.alt}
            draggable={false}
            referrerPolicy='no-referrer'
            onError={() => onError(new Error(`图片加载失败：${widget.props.src}`))}
            onLoad={() => {
                onProgress(1, 1);
                onReady();
            }}
            style={{
                display: 'block',
                height: '100%',
                objectFit: widget.props.objectFit,
                objectPosition: widget.props.objectPosition,
                pointerEvents: 'none',
                userSelect: 'none',
                width: '100%',
            }}
        />
    ),
});

export const imageWidgetInspector: WidgetInspectorDefinition = {
    kind: 'image',
    schema: {
        fields: [
            { key: 'src', label: '图片地址', path: 'props.src', control: 'string', order: 100 },
            { key: 'alt', label: '替代文本', path: 'props.alt', control: 'string', order: 200 },
            {
                key: 'objectFit', label: '缩放方式', path: 'props.objectFit', control: 'enum', order: 300,
                options: [
                    { label: '裁切填充', value: 'cover' },
                    { label: '完整显示', value: 'contain' },
                    { label: '拉伸', value: 'fill' },
                    { label: '原尺寸', value: 'none' },
                    { label: '自适应', value: 'scale-down' },
                ],
            },
            { key: 'objectPosition', label: '图片位置', path: 'props.objectPosition', control: 'string', order: 400, description: '例如 center 或 50% 30%' },
        ],
    },
};
