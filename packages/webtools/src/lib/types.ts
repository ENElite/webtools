/**
 * 工具定义类型 - 每个工具的 tool.ts 必须导出一个符合此接口的对象
 *
 * @example
 * ```ts
 * // app/tools/my-tool/tool.ts
 * import type { ToolDefinition } from '@/lib/types';
 *
 * const tool: ToolDefinition = {
 *   id: 'my-tool',
 *   name: '我的工具',
 *   description: '这是一个示例工具',
 *   icon: '🔧',
 *   category: 'utility',
 *   tags: ['示例', '工具'],
 * };
 *
 * export default tool;
 * ```
 */
export interface ToolDefinition {
    /** 工具唯一标识，与目录名一致 */
    id: string;
    /** 工具显示名称 */
    name: string;
    /** 工具描述 */
    description: string;
    /** 工具图标 (emoji) */
    icon: string;
    /** 工具分类 */
    category: ToolCategory;
    /** 搜索标签 */
    tags: string[];
}

/** 工具分类枚举 */
export type ToolCategory = 'image' | 'text' | 'code' | 'utility';

/** 系统内部使用的完整工具信息（包含路由路径） */
export interface Tool extends ToolDefinition {
    /** 工具路由路径，由系统自动生成 */
    href: string;
}

/** 分类定义 */
export interface Category {
    id: ToolCategory;
    name: string;
    icon: string;
}
