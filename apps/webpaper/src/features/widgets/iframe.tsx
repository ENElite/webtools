import { defineWidgetPlugin } from '@webtools/widget-core';
import { defineWidgetView } from '@webtools/widget-react';
import type { WidgetInspectorDefinition } from '@webtools/widget-studio';
import { z } from 'zod';

const httpUrlSchema = z.string().url().refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
}, '仅允许 HTTP(S) URL');

export const iframeWidgetPropsSchema = z.object({
    url: httpUrlSchema,
    title: z.string().min(1),
    allow: z.string(),
}).strict();

export type IframeWidgetProps = z.infer<typeof iframeWidgetPropsSchema>;

export const iframeWidgetDefinition = defineWidgetPlugin({
    kind: 'iframe',
    label: '网页',
    propsSchema: iframeWidgetPropsSchema,
    defaultProps: {
        url: 'https://example.com',
        title: '嵌入网页',
        allow: 'fullscreen',
    },
});

export const iframeWidgetView = defineWidgetView<IframeWidgetProps>({
    kind: 'iframe',
    View: ({ widget }) => (
        <iframe
            src={widget.props.url}
            title={widget.props.title}
            sandbox='allow-forms allow-popups allow-presentation allow-scripts'
            allow={widget.props.allow}
            referrerPolicy='no-referrer'
            loading='lazy'
            style={{ border: 0, display: 'block', height: '100%', width: '100%' }}
        />
    ),
});

export const iframeWidgetInspector: WidgetInspectorDefinition = {
    kind: 'iframe',
    schema: {
        fields: [
            { key: 'url', label: '网页地址', path: 'props.url', control: 'string', order: 100, description: '仅支持 HTTP(S)' },
            { key: 'title', label: '无障碍标题', path: 'props.title', control: 'string', order: 200 },
            { key: 'allow', label: 'Permissions Policy', path: 'props.allow', control: 'string', order: 300 },
        ],
    },
};
