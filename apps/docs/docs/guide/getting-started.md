# 快速开始

## 环境要求

- Node.js 24.x
- 通过 Corepack 使用 pnpm 11.24.0

```bash
corepack enable
pnpm install --frozen-lockfile
```

pnpm 12 仍可由根 `engines` 接受，但只有正式稳定版发布并通过 CI 后才会更新根 `packageManager`。

## 开发

```bash
pnpm dev:webpaper
pnpm dev:webtools
pnpm dev:docs
```

## 质量门禁

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

测试文件应放在被测模块附近。新增跨包引用时使用公开包名，不使用相对路径进入其他工作区，也不引用 `@webtools/*/src/*`。
