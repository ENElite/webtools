import { defineWidgetPlugin } from '@webtools/widget-core';
import { defineWidgetView } from '@webtools/widget-react';
import type { WidgetInspectorDefinition } from '@webtools/widget-studio';
import { z } from 'zod';

const DEFAULT_HTML = `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;display:grid;place-items:center;height:100vh;background:transparent;color:white;font:500 24px system-ui">
  <p>HTML Widget</p>
</body>
</html>`;

export const htmlWidgetPropsSchema = z.object({
    html: z.string(),
    title: z.string().min(1),
}).strict();

export type HtmlWidgetProps = z.infer<typeof htmlWidgetPropsSchema>;

export const htmlWidgetDefinition = defineWidgetPlugin({
    kind: 'html',
    label: 'HTML',
    propsSchema: htmlWidgetPropsSchema,
    defaultProps: {
        html: DEFAULT_HTML,
        title: 'HTML 预览',
    },
});

export const htmlWidgetView = defineWidgetView<HtmlWidgetProps>({
    kind: 'html',
    View: ({ widget }) => (
        <iframe
            srcDoc={widget.props.html}
            title={widget.props.title}
            sandbox=''
            referrerPolicy='no-referrer'
            style={{ border: 0, display: 'block', height: '100%', width: '100%' }}
        />
    ),
});

export const htmlWidgetInspector: WidgetInspectorDefinition = {
    kind: 'html',
    schema: {
        fields: [
            { key: 'html', label: '源代码', path: 'props.html', control: 'code', language: 'html', order: 100, description: '在无权限 sandbox iframe 中预览' },
            { key: 'title', label: '无障碍标题', path: 'props.title', control: 'string', order: 200 },
        ],
    },
};
