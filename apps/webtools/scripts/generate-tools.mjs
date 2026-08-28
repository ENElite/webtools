/**
 * 工具列表生成脚本
 *
 * 扫描 app/tools 下所有 tool.ts, 生成 tools.generated.ts
 * 生成的文件使用静态 import, Turbopack 可正确解析
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PKG_DIR = resolve(__dirname, '..');
const TOOLS_DIR = resolve(PKG_DIR, 'src/app/tools');
const OUTPUT_PATH = resolve(PKG_DIR, 'src/lib/tools.generated.ts');
const LIB_DIR = resolve(PKG_DIR, 'src/lib');

function main() {
    console.log('扫描工具目录...\n');

    const entries = readdirSync(TOOLS_DIR, { withFileTypes: true });
    const tools = [];

    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        if (!entry.isDirectory()) continue;
        tools.push(entry.name);
        console.log(`  ${entry.name}`);
    }

    console.log(`\n发现 ${tools.length} 个工具`);

    // 生成静态 import 语句
    const imports = tools
        .map((name, i) => {
            const relPath = relative(LIB_DIR, resolve(TOOLS_DIR, name, 'tool'));
            return `import tool${i} from '${relPath}';`;
        })
        .join('\n');

    // 生成 tools 数组
    const toolEntries = tools
        .map((name, i) => `    { ...tool${i}, href: '/tools/${name}' },`)
        .join('\n');

    const code = `/**
 * 此文件由 scripts/generate-tools.mjs 自动生成
 * 请勿手动编辑
 */
import type { Tool } from './types';

${imports}

export const tools: Tool[] = [
${toolEntries}
];
`;

    writeFileSync(OUTPUT_PATH, code, 'utf-8');
    console.log(`已生成 ${OUTPUT_PATH}`);
}

main();
