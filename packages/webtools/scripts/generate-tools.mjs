/**
 * 生产环境工具列表生成脚本
 *
 * 扫描 app/tools 下所有 tool.ts, 生成 tools.generated.ts
 * 仅在 next build 前运行, 生成的文件只存在于构建产物中
 */
import 'tsx';
import { readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PKG_DIR = resolve(__dirname, '..');
const TOOLS_DIR = resolve(PKG_DIR, 'src/app/tools');
const OUTPUT_PATH = resolve(PKG_DIR, 'src/lib/tools.generated.ts');

/**
 * 校验导出是否合法
 */
function validate(def) {
    if (!def || typeof def !== 'object') return false;
    return (
        typeof def.id === 'string' &&
        typeof def.name === 'string' &&
        typeof def.description === 'string' &&
        typeof def.icon === 'string' &&
        ['image', 'text', 'code', 'utility'].includes(def.category) &&
        Array.isArray(def.tags)
    );
}

async function main() {
    console.log('扫描工具目录...\n');

    const entries = readdirSync(TOOLS_DIR, { withFileTypes: true });
    const tools = [];

    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        if (!entry.isDirectory()) continue;

        const dirName = entry.name;
        const toolPath = resolve(TOOLS_DIR, dirName, 'tool.ts');

        let mod;
        try {
            mod = await import(toolPath);
        } catch {
            continue;
        }

        const def = mod.default;
        if (!validate(def)) {
            console.warn(`  ${dirName}: 导出不符合 ToolDefinition, 已跳过`);
            continue;
        }

        if (def.id !== dirName) {
            console.warn(`  ${dirName}: id "${def.id}" 与目录名不一致`);
        }

        tools.push({ ...def, href: `/tools/${dirName}` });
        console.log(`  ${dirName}`);
    }

    console.log(`\n发现 ${tools.length} 个工具`);

    const code = `/**
 * 此文件由 scripts/generate-tools.mjs 自动生成
 * 请勿手动编辑, 仅在生产构建时使用
 */
import type { Tool } from './types';

export const tools: Tool[] = ${JSON.stringify(tools, null, 4)};
`;

    writeFileSync(OUTPUT_PATH, code, 'utf-8');
    console.log(`已生成 ${OUTPUT_PATH}`);
}

main();
