import type { InspectorSchema } from '../../engine/editor';
import { LIVE2D_MODEL_TREE_DATA } from './models';
import type { WidgetLayout } from '../../engine/model';

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
    order: 1,
}

export const LIVE2D_WIDGET_SETTINGS_SCHEMA: InspectorSchema = [
    {
        key: 'source',
        label: '模型来源',
        type: 'enum',
        page: 'widget',
        order: 100,
        bind: 'props.source',
        meta: {
            options: [
                { label: 'URL', value: 'url' },
                { label: '模型列表', value: 'builtin' },
            ],
        },
    },
    {
        key: 'modelUrl',
        label: '模型 URL',
        type: 'string',
        page: 'widget',
        order: 200,
        bind: 'props.modelUrl',
        visibleWhen: {
            field: 'props.source',
            equals: 'url',
        },
        meta: { placeholder: '输入模型文件 URL' },
    },
    {
        key: 'modelPath',
        label: '模型列表',
        type: 'treeSelect',
        page: 'widget',
        order: 300,
        bind: 'props.modelPath',
        visibleWhen: {
            field: 'props.source',
            equals: 'builtin',
        },
        meta: {
            treeData: LIVE2D_MODEL_TREE_DATA,
            placeholder: '选择模型',
            allowClear: false,
        },
    },
    {
        key: 'scale',
        label: '缩放比例',
        type: 'slider',
        page: 'widget',
        order: 400,
        bind: 'props.scale',
        meta: { min: 0.1, max: 5, step: 0.1 },
    },
    {
        key: 'renderPrecision',
        label: '渲染精度 (%)',
        type: 'slider',
        page: 'widget',
        order: 500,
        bind: 'props.renderPrecision',
        meta: { min: 50, max: 300, step: 10 },
    },
    {
        key: 'resizeDelay',
        label: 'resize 延迟 (ms)',
        type: 'number',
        page: 'widget',
        order: 600,
        bind: 'props.resizeDelay',
        meta: { min: 0, max: 2000, step: 50 },
    },
];
