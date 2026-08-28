import type { ToolCategory, Category } from './types';

// ─── 分类定义 ─────────────────────────────────────────────────

export const categories: Category[] = [
    { id: 'image', name: '图片工具', icon: '🖼️' },
    { id: 'text', name: '文本工具', icon: '📝' },
    { id: 'code', name: '代码工具', icon: '💻' },
    { id: 'utility', name: '实用工具', icon: '🛠️' },
];

export type { Tool, ToolCategory, Category } from './types';
export type { ToolDefinition } from './types';
