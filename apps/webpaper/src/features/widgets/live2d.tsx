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
    clickMotion: z.boolean(),
    motionGroup: z.string(),
    motionIndex: z.number().int().min(-1).max(999),
    motionPriority: z.number().int().min(1).max(3),
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
        clickMotion: true,
        motionGroup: '',
        motionIndex: -1,
        motionPriority: 2,
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
                clickMotion={widget.props.clickMotion}
                motionGroup={widget.props.motionGroup}
                motionIndex={widget.props.motionIndex}
                motionPriority={widget.props.motionPriority}
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
            { key: 'motion', label: '动作', order: 300 },
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
            {
                key: 'clickMotion',
                label: '点击播放动作',
                path: 'props.clickMotion',
                control: 'boolean',
                page: 'motion',
                order: 100,
                description: '点击模型时从它实际提供的 motion groups 中播放动作。',
            },
            {
                key: 'motionGroup',
                label: '动作组',
                path: 'props.motionGroup',
                control: 'string',
                page: 'motion',
                order: 200,
                description: '例如 TapBody 或 Idle；留空自动选择可用动作组。',
                visibleWhen: { path: 'props.clickMotion', equals: true },
            },
            {
                key: 'motionIndex',
                label: '动作索引',
                path: 'props.motionIndex',
                control: 'number',
                page: 'motion',
                order: 300,
                min: -1,
                max: 999,
                step: 1,
                description: '-1 表示在动作组内随机播放。',
                visibleWhen: { path: 'props.clickMotion', equals: true },
            },
            {
                key: 'motionPriority',
                label: '播放优先级',
                path: 'props.motionPriority',
                control: 'enum',
                page: 'motion',
                order: 400,
                options: [
                    { label: '空闲 (1)', value: 1 },
                    { label: '普通 (2)', value: 2 },
                    { label: '强制 (3)', value: 3 },
                ],
                visibleWhen: { path: 'props.clickMotion', equals: true },
            },
        ],
    },
};
