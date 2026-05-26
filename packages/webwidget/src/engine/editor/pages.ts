import type { PageRegistry } from './types';

export const WIDGET_PAGE_REGISTRY: PageRegistry = [
    { key: 'basic', label: '基本设置', order: 100 },
    { key: 'style', label: '样式设置', order: 200 },
    { key: 'animation', label: '动画设置', order: 250 },
    { key: 'widget', label: '组件设置', order: 300 },
];
