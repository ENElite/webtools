import type { ToolDefinition } from '@/lib/types';

const tool: ToolDefinition = {
    id: 'image-diff',
    name: '图片对比',
    description: '逐像素对比两张图片的差异，支持差异视图、分割视图和切换视图',
    icon: '🔀',
    category: 'image',
    tags: ['图片', '对比', '差异', 'diff'],
};

export default tool;
