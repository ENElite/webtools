import type { InspectorSchema } from '../../engine/editor';

export type HtmlWidgetProps = {
    html: string;
};

export const DEFAULT_HTML_WIDGET_PROPS: HtmlWidgetProps = {
    html: `<div style="font-family: ui-sans-serif, system-ui; padding: 20px; color: #0f172a; background: linear-gradient(135deg,#e2e8f0,#f8fafc); height: 100%; box-sizing: border-box;">
  <h2 style="margin: 0 0 12px;">Hello iframe</h2>
  <p style="margin: 0; line-height: 1.5;">在组件设置里编辑 HTML，点击编辑器保存后将立即写入 iframe。</p>
</div>`,
};

export const HTML_WIDGET_SETTINGS_SCHEMA: InspectorSchema = [
    {
        key: 'html',
        label: '源代码',
        type: 'editor',
        page: 'widget',
        order: 100,
        bind: 'props.html',
        meta: {
            language: 'html',
            height: 360,
            saveButtonText: '保存到 iframe',
        },
    },
];