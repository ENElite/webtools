import type { WidgetSettingsSchema } from '../schema';
import { LIVE2D_MODEL_TREE_DATA } from './models';
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
    source: 'builtin',
    modelUrl: '',
    modelPath: "https://raw.githubusercontent.com/Eikanya/Live2d-model/94ae3e5628226726af96c6b4bf0e1ce5c728e28e/%E5%B0%91%E5%A5%B3%E5%89%8D%E7%BA%BF%20girls%20Frontline/live2dnew/hk416_3401/destroy/destroy.model3.json",
    scale: 1,
    renderPrecision: 200,
    resizeDelay: 0,
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
        type: 'slider',
        min: 0.1,
        max: 5,
        step: 0.1,
    },
    {
        key: 'renderPrecision',
        label: '渲染精度 (%)',
        type: 'slider',
        min: 50,
        max: 300,
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
