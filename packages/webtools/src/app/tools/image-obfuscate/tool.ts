import type { ToolDefinition } from '@/lib/types';

const tool: ToolDefinition = {
    id: 'image-obfuscate',
    name: '图片混淆',
    description: '对图片进行混淆处理，保护隐私信息',
    icon: '🔒',
    category: 'image',
    tags: ['图片', '混淆', '隐私'],
};

export default tool;
