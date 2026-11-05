import type { ToolDefinition } from '@/lib/types';

const tool: ToolDefinition = {
    id: 'word-count',
    name: '字数统计器',
    description: '实时统计字数、汉字、英文单词、数字、行数和段落数',
    icon: '📝',
    category: 'text',
    tags: ['字数', '字符', '统计', '文本', '单词', 'word', 'count'],
};

export default tool;
