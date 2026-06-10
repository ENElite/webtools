export interface Tool {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: string;
  category: 'image' | 'text' | 'code' | 'utility';
  tags: string[];
}

export const tools: Tool[] = [
  {
    id: 'image-show',
    name: '图片查看器',
    description: '选择并预览图片，支持多种格式和缩放功能',
    href: '/tools/image-show',
    icon: '🖼️',
    category: 'image',
    tags: ['图片', '预览', '查看'],
  },
  // 未来可以在这里添加更多工具
  // {
  //   id: 'image-obfuscate',
  //   name: '图片混淆',
  //   description: '对图片进行混淆处理，保护隐私信息',
  //   href: '/tools/image-obfuscate',
  //   icon: '🔒',
  //   category: 'image',
  //   tags: ['图片', '混淆', '隐私'],
  // },
  // {
  //   id: 'code-editor',
  //   name: '代码编辑器',
  //   description: '在线代码编辑器，支持语法高亮和智能提示',
  //   href: '/tools/code-editor',
  //   icon: '💻',
  //   category: 'code',
  //   tags: ['代码', '编辑', 'Monaco'],
  // },
];

export const categories = [
  { id: 'image', name: '图片工具', icon: '🖼️' },
  { id: 'text', name: '文本工具', icon: '📝' },
  { id: 'code', name: '代码工具', icon: '💻' },
  { id: 'utility', name: '实用工具', icon: '🛠️' },
];

// 未来可以在这里添加更多工具示例
// export const additionalTools: Tool[] = [
//   {
//     id: 'image-obfuscate',
//     name: '图片混淆',
//     description: '对图片进行混淆处理，保护隐私信息',
//     href: '/tools/image-obfuscate',
//     icon: '🔒',
//     category: 'image',
//     tags: ['图片', '混淆', '隐私'],
//   },
//   {
//     id: 'code-editor',
//     name: '代码编辑器',
//     description: '在线代码编辑器，支持语法高亮和智能提示',
//     href: '/tools/code-editor',
//     icon: '💻',
//     category: 'code',
//     tags: ['代码', '编辑', 'Monaco'],
//   },
// ];
