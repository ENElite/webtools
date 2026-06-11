import { defineConfig } from 'vitepress';

export default defineConfig({
    srcDir: 'docs',
    title: 'WebTools',
    description: 'WebTools — 桌面小组件引擎与图片浏览器文档',
    lang: 'zh-CN',
    lastUpdated: true,
    themeConfig: {
        logo: '/logo.svg',
        nav: [
            { text: '指南', link: '/guide/', activeMatch: '/guide/' },
            { text: '包文档', link: '/packages/webwidget', activeMatch: '/packages/' },
            { text: '设计文档', link: '/design/widget-engine', activeMatch: '/design/' },
            { text: 'API 参考', link: '/api/model-types', activeMatch: '/api/' },
        ],
        sidebar: {
            '/guide/': [
                {
                    text: '指南',
                    items: [
                        { text: '项目概览', link: '/guide/' },
                        { text: '技术栈', link: '/guide/tech-stack' },
                        { text: '架构设计', link: '/guide/architecture' },
                        { text: '快速开始', link: '/guide/getting-started' },
                    ],
                },
            ],
            '/packages/': [
                {
                    text: '包文档',
                    items: [
                        { text: 'webwidget — 小组件引擎', link: '/packages/webwidget' },
                        { text: 'webpaper — 图片浏览器', link: '/packages/webpaper' },
                        { text: 'webtest — 集中测试', link: '/packages/webtest' },
                    ],
                },
            ],
            '/design/': [
                {
                    text: '设计文档',
                    items: [
                        { text: '小组件引擎', link: '/design/widget-engine' },
                        { text: 'WidgetLayout 布局系统', link: '/design/widget-layout' },
                        { text: '信号系统', link: '/design/signal-system' },
                        { text: '命令模式', link: '/design/command-pattern' },
                        { text: '动画系统', link: '/design/animation' },
                        { text: '信号槽连接系统', link: '/design/signal-slot-system' },
                        { text: '数据提供者', link: '/design/providers' },
                        { text: '数据提供者（详细）', link: '/design/providers-detail' },
                        { text: 'ImageHero 显示模式', link: '/design/imagehero-modes' },
                        { text: 'Live2D 模型生成', link: '/design/live2d-models' },
                        { text: '运行时架构', link: '/design/runtime' },
                        { text: 'Moveable Position 定位系统', link: '/design/moveable-position' },
                    ],
                },
            ],
            '/api/': [
                {
                    text: 'API 参考',
                    items: [
                        { text: '模型类型', link: '/api/model-types' },
                        { text: '编辑器系统', link: '/api/editors' },
                        { text: 'Hooks', link: '/api/hooks' },
                    ],
                },
            ],
        },
        socialLinks: [
            { icon: 'github', link: 'https://github.com/anthropics/claude-code' },
        ],
        footer: {
            message: 'Released under the MIT License.',
            copyright: 'Copyright © 2024-present WebTools',
        },
        search: {
            provider: 'local',
        },
    },
    markdown: {
        math: true,
    },
});
