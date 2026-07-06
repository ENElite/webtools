/**
 * 服务端工具扫描器
 *
 * 仅在服务端组件中使用 (Node.js 环境)
 * 通过 tsx 加载 tool.ts 模块, 获取导出的 ToolDefinition
 */
import 'tsx'; // 注册 tsx loader, 支持 TS 语法和 import type 剥离
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Tool, ToolDefinition } from './types';

const TOOLS_DIR = resolve(process.cwd(), 'src/app/tools');

/**
 * 校验 ToolDefinition 是否合法
 */
function validate(def: unknown): def is ToolDefinition {
    if (!def || typeof def !== 'object') return false;
    const obj = def as Record<string, unknown>;
    return (
        typeof obj.id === 'string' &&
        typeof obj.name === 'string' &&
        typeof obj.description === 'string' &&
        typeof obj.icon === 'string' &&
        ['image', 'text', 'code', 'utility'].includes(obj.category as string) &&
        Array.isArray(obj.tags)
    );
}

/**
 * 扫描所有工具目录, 通过 import() 加载每个 tool.ts
 */
export async function getTools(): Promise<Tool[]> {
    const entries = readdirSync(TOOLS_DIR, { withFileTypes: true });
    const tools: Tool[] = [];

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const dirName = entry.name;
        const toolPath = resolve(TOOLS_DIR, dirName, 'tool.ts');

        let mod: { default?: unknown };
        try {
            mod = await import(toolPath);
        } catch {
            continue; // 没有 tool.ts 或导入失败, 跳过
        }

        const def = mod.default;
        if (!validate(def)) {
            console.warn(`[tools] ${dirName}: tool.ts 导出不符合 ToolDefinition, 已跳过`);
            continue;
        }

        if (def.id !== dirName) {
            console.warn(`[tools] ${dirName}: id "${def.id}" 与目录名不一致`);
        }

        tools.push({ ...def, href: `/tools/${dirName}` });
    }

    return tools.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}
