import type { WidgetSettingsSchema } from '../schema';
import { DEFAULT_LIVE2D_MODEL3_PATH } from '@/lib/live2d';
import { WidgetLayout } from '../types';

export type Live2dWidgetProps = {
    modelPath: string;
    scale: number;
    renderPrecision: number;
    resizeDelay: number;
    enableInteraction: boolean;
    enablePointerTracking: boolean;
    autoAnimation: boolean;
};

export const DEFAULT_LIVE2D_WIDGET_PROPS: Live2dWidgetProps = {
    modelPath: DEFAULT_LIVE2D_MODEL3_PATH,
    scale: 1,
    renderPrecision: 180,
    resizeDelay: 250,
    enableInteraction: true,
    enablePointerTracking: true,
    autoAnimation: true,
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
        key: 'modelPath',
        label: '模型路径',
        type: 'string',
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
        key: 'enableInteraction',
        label: '启用交互',
        type: 'boolean',
    },
    {
        key: 'enablePointerTracking',
        label: '启用鼠标追踪',
        type: 'boolean',
    },
    {
        key: 'autoAnimation',
        label: '自动动画',
        type: 'boolean',
    },
] satisfies WidgetSettingsSchema;
