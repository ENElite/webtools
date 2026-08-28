# 快速开始

## 环境要求

- Node.js >= 18
- pnpm >= 10.8

## 安装依赖

```bash
# 在项目根目录执行
pnpm install
```

## 开发

```bash
# 启动 webpaper 开发服务器（端口 5173）
pnpm dev:webpaper

# 或进入 webpaper 目录
cd packages/webpaper
pnpm dev
```

## 构建

```bash
# 构建 webpaper
pnpm build:webpaper

# 或进入 webpaper 目录
cd packages/webpaper
pnpm build
```

## 测试

```bash
# 运行所有测试
cd packages/webtest
pnpm test

# 监听模式
pnpm test:watch
```

## 代码规范

```bash
# Lint
pnpm lint

# 格式化
pnpm format

# 类型检查
pnpm typecheck
```

## Live2D 模型生成

```bash
cd packages/webpaper

# 生成模型列表（从 GitHub 仓库拉取）
pnpm generate-models

# 干跑模式（不实际写入文件）
pnpm generate-models:dry-run

# 交互模式
pnpm generate-models:interactive
```

## 文档站点

```bash
cd packages/webdocs
pnpm dev
```
