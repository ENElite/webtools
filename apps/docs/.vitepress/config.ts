import { defineConfig } from 'vitepress';

export default defineConfig({
    srcDir: 'docs',
    title: 'WebTools',
    description: 'WebTools — WebPaper 与分层 Widget 平台文档',
    lang: 'zh-CN',
    lastUpdated: true,
    base: '/webtools/',
    themeConfig: {
        logo: '/logo.svg',
        nav: [
            { text: '指南', link: '/guide/', activeMatch: '/guide/' },
            { text: '包文档', link: '/packages/widgets', activeMatch: '/packages/' },
            { text: '设计文档', link: '/design/widget-runtime', activeMatch: '/design/' },
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
                        { text: 'Widget 分层包', link: '/packages/widgets' },
                        { text: 'WebPaper 应用', link: '/packages/webpaper' },
                    ],
                },
            ],
            '/design/': [
                {
                    text: '设计文档',
                    items: [
                        { text: 'Widget 运行时', link: '/design/widget-runtime' },
                        { text: '媒体管线', link: '/design/media-pipeline' },
                    ],
                },
            ],
        },
        socialLinks: [
            { icon: 'github', link: 'https://github.com/enelite/webtools' },
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
