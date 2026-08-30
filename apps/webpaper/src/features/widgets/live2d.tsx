'use client';

import { defineWidgetPlugin } from '@webtools/widget-core';
import { defineWidgetView } from '@webtools/widget-react';
import type { WidgetInspectorDefinition } from '@webtools/widget-studio';
import { z } from 'zod';

import { Live2dWidgetRuntime } from './live2d-runtime';

export { Live2dWidgetRuntime } from './live2d-runtime';

export const LIVE2D_RUNTIME_STATUS = 'enabled' as const;

export const LIVE2D_BUILTIN_MODELS = Object.freeze([
    {
        label: 'HK416 · 重创',
        value: 'https://raw.githubusercontent.com/Eikanya/Live2d-model/94ae3e5628226726af96c6b4bf0e1ce5c728e28e/%E5%B0%91%E5%A5%B3%E5%89%8D%E7%BA%BF%20girls%20Frontline/live2dnew/hk416_3401/destroy/destroy.model3.json',
    },
] as const);

export const live2dWidgetPropsSchema = z.object({
    source: z.enum(['url', 'builtin']),
    modelUrl: z.string(),
    modelPath: z.string().url(),
    scale: z.number().finite().min(0.1).max(5),
    renderPrecision: z.number().finite().min(50).max(300),
    resizeDelay: z.number().finite().nonnegative().max(2_000),
    interaction: z.boolean(),
}).strict();

export type Live2dWidgetProps = z.infer<typeof live2dWidgetPropsSchema>;

export const live2dWidgetDefinition = defineWidgetPlugin({
    kind: 'live2d',
    label: 'Live2D',
    propsSchema: live2dWidgetPropsSchema,
    defaultProps: {
        source: 'builtin',
        modelUrl: '',
        modelPath: LIVE2D_BUILTIN_MODELS[0].value,
        scale: 1,
        renderPrecision: 200,
        resizeDelay: 0,
        interaction: true,
    },
    defaultLayout: {
        anchorX: 'right',
        anchorY: 'bottom',
        adapt: 'fixed',
        x: -5,
        y: -5,
        w: 20,
        h: 45,
    },
});

export const live2dWidgetView = defineWidgetView<Live2dWidgetProps>({
    kind: 'live2d',
    View: ({ widget }) => {
        const configuredModel = widget.props.source === 'url'
            ? (widget.props.modelUrl || widget.props.modelPath)
            : widget.props.modelPath;
        return (
            <Live2dWidgetRuntime
                modelPath={configuredModel}
                scale={widget.props.scale}
                renderPrecision={widget.props.renderPrecision}
                resizeDelay={widget.props.resizeDelay}
                interaction={widget.props.interaction}
            />
        );
    },
});

export const live2dWidgetInspector: WidgetInspectorDefinition = {
    kind: 'live2d',
    schema: {
        pages: [
            { key: 'model', label: '模型', order: 100 },
            { key: 'rendering', label: '渲染', order: 200 },
        ],
        fields: [
            {
                key: 'source',
                label: '模型来源',
                path: 'props.source',
                control: 'enum',
                page: 'model',
                order: 100,
                options: [
                    { label: '内置模型', value: 'builtin' },
                    { label: '自定义 URL', value: 'url' },
                ],
            },
            {
                key: 'modelUrl',
                label: '模型 URL',
                path: 'props.modelUrl',
                control: 'string',
                page: 'model',
                order: 200,
                description: '填写 .model.json、.model3.json 或 .model4.json 地址',
                visibleWhen: { path: 'props.source', equals: 'url' },
            },
            {
                key: 'modelPath',
                label: '内置模型',
                path: 'props.modelPath',
                control: 'enum',
                page: 'model',
                order: 300,
                options: LIVE2D_BUILTIN_MODELS,
                visibleWhen: { path: 'props.source', equals: 'builtin' },
            },
            {
                key: 'scale',
                label: '模型缩放',
                path: 'props.scale',
                control: 'slider',
                page: 'rendering',
                order: 100,
                min: 0.1,
                max: 5,
                step: 0.1,
            },
            {
                key: 'renderPrecision',
                label: '渲染精度 (%)',
                path: 'props.renderPrecision',
                control: 'slider',
                page: 'rendering',
                order: 200,
                min: 50,
                max: 300,
                step: 10,
            },
            {
                key: 'resizeDelay',
                label: 'Resize 延迟 (ms)',
                path: 'props.resizeDelay',
                control: 'number',
                page: 'rendering',
                order: 300,
                min: 0,
                max: 2_000,
                step: 50,
            },
            {
                key: 'interaction',
                label: '允许模型交互',
                path: 'props.interaction',
                control: 'boolean',
                page: 'rendering',
                order: 400,
                description: '真实运行时接入后用于控制点击与指针跟随。',
            },
        ],
    },
};
