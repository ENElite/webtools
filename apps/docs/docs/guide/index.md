# 项目概览

WebTools 使用 `apps/*` 承载可部署产物，使用 `packages/*` 承载可复用能力。主应用 WebPaper 同时组合媒体播放器与 Widget 平台，但媒体领域和 Widget 内核互不依赖。

| 工作区 | 职责 |
| --- | --- |
| `apps/webpaper` | 壁纸源、播放器、历史、应用设置和组合根 |
| `apps/webtools` | 图片与媒体工具集合，静态导出 |
| `apps/docs` | 当前架构和开发约束 |
| `packages/widget-core` | 文档模型、Schema、事务、历史 |
| `packages/widget-react` | Canvas、交互、布局换算、渲染目录 |
| `packages/widget-studio` | Inspector、Devtools、代码与 AI 编辑 |

架构有两个重要的负向约束：不设置无明确职责的 `shared` 包，也不建立脱离所有者的集中式 `webtest` 包。
