# 技术栈

| 层 | 技术 | 约束 |
| --- | --- | --- |
| 运行时 | Node.js 24 | 根 `.node-version` 与容器一致 |
| 工作区 | pnpm 11.24、Turbo 2 | catalog 统一核心版本，任务按包编排 |
| 应用 | Next.js 16、React 19 | WebPaper 使用 standalone；WebTools 静态导出 |
| 类型 | TypeScript 5.9、Zod 4 | 新核心包启用严格检查和运行时边界校验 |
| 样式 | Tailwind CSS 4 | 由应用决定主题，核心状态不依赖 CSS |
| 测试 | Vitest 4 | 单元/组件测试与所有者共置 |
| 质量 | ESLint 9 flat config | React Hooks、Next 规则和工作区依赖边界 |
| 编辑器 | Monaco、Ant Design | 仅存在于 `widget-studio`，不污染运行时包 |

版本策略集中在 `pnpm-workspace.yaml` catalog。应用或库通过 `catalog:` 使用统一版本，包间依赖使用 `workspace:*`。
