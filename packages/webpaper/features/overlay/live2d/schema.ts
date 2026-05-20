import type { WidgetSettingsSchema } from '../schema';
import { DEFAULT_LIVE2D_MODEL3_PATH } from '@/lib/live2d';
import { LIVE2D_MODEL_TREE_DATA } from '@/lib/live2d/models';
import { WidgetLayout } from '../types';

export type Live2dWidgetProps = {
    source: 'url' | 'builtin';
    modelUrl?: string;
    modelPath: string;
    scale: number;
    renderPrecision: number;
    resizeDelay: number;
    interaction: boolean;
};

export const DEFAULT_LIVE2D_WIDGET_PROPS: Live2dWidgetProps = {
    source: 'url',
    modelUrl: '/live2d/assets/hiyori/runtime/hiyori_free_t08.model3.json',
    modelPath: DEFAULT_LIVE2D_MODEL3_PATH,
    scale: 1,
    renderPrecision: 180,
    resizeDelay: 250,
    interaction: true,
};

export const DEFAULT_LIVE2D_WIDGET_LAYOUT: WidgetLayout = {
    anchorX: 'right',
    anchorY: 'bottom',
    adapt: 'fixed',
    x: -5,
    y: -5,
    w: 5,
    h: 10,
    rotation: 0,
}

export const LIVE2D_WIDGET_SETTINGS_SCHEMA = [
    {
        key: 'source',
        label: '模型来源',
        type: 'enum',
        options: [
            { label: 'URL', value: 'url' },
            { label: '模型列表', value: 'builtin' },
        ],
    },
    {
        key: 'modelUrl',
        label: '模型 URL',
        type: 'string',
        placeholder: '输入模型文件 URL',
        visibleWhen: {
            key: 'source',
            equals: 'url',
        },
    },
    {
        key: 'modelPath',
        label: '模型列表',
        type: 'treeSelect',
        treeData: LIVE2D_MODEL_TREE_DATA,
        placeholder: '选择模型',
        allowClear: false,
        visibleWhen: {
            key: 'source',
            equals: 'builtin',
        }
    },
    {
        key: 'scale',
        label: '缩放比例',
        type: 'number',
        min: 0.1,
        max: 5,
        step: 0.1,
    },
    {
        key: 'renderPrecision',
        label: '渲染精度 (%)',
        type: 'number',
        min: 50,
        max: 200,
        step: 10,
    },
    {
        key: 'resizeDelay',
        label: 'resize 延迟 (ms)',
        type: 'number',
        min: 0,
        max: 2000,
        step: 50,
    },
    {
        key: 'interaction',
        label: '启用交互',
        type: 'boolean',
    }
] satisfies WidgetSettingsSchema;
