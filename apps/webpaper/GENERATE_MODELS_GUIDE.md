# Models List Generation Guide

本脚本用于从 Live2d-model GitHub 仓库生成模型列表静态文件。

## 快速开始

### 最简单的方式 - 生成最新模型列表

```bash
node scripts/generate-models-list.cjs
```

这会：
1. 从 GitHub 获取最新的 commit hash
2. 检查当前 `models.json` 是否需要更新
3. 如果需要，克隆仓库、提取模型、生成 JSON
4. 将结果保存到 `packages/webwidget/src/overlay/live2d/models.json`

### 试运行（不实际克隆）

```bash
node scripts/generate-models-list.cjs --dry-run
```

输出示例：
```
🚀 Generating Live2d models list...
📡 Fetching latest commit hash from remote...
✓ Latest commit: 94ae3e5628226726af96c6b4bf0e1ce5c728e28e
📋 [DRY-RUN] Would generate models list for commit: 94ae3e5628226726af96c6b4bf0e1ce5c728e28e
✓ Done!
```

### 其他常用命令

```bash
# 指定输出路径
node scripts/generate-models-list.cjs -o /path/to/models.json

# 指定特定的 commit hash（跳过版本检查）
node scripts/generate-models-list.cjs --hash 94ae3e5628226726af96c6b4bf0e1ce5c728e28e

# 交互选择 commit hash
node scripts/generate-models-list.cjs -i
```

## 脚本做了什么？

1. **获取最新版本**：从 GitHub 获取 Live2d-model 仓库的最新 commit hash
2. **版本检查**：对比当前 `models.json` 的版本是否需要更新
3. **克隆仓库**：浅克隆指定 commit 的仓库
4. **提取模型**：
   - 找到所有 `.model.json`、`.model3.json` 和 `.model4.json` 文件
   - 自动解压 zip 文件
   - 仅保留 Version 3 或 4 的模型
5. **去重处理**：同一模型有多个版本时，仅保留最新的
6. **生成树结构**：
   - 按目录结构组织模型
   - 自动提升单一子路径（展平不必要的嵌套）
7. **生成 JSON**：
   - 创建树形 JSON
   - 为每个模型添加 raw.githubusercontent.com URL
   - 包含元数据（版本、生成时间、总数）

## 输出文件格式

生成的 `models.json` 包含：

```json
{
  "version": "94ae3e5628226726af96c6b4bf0e1ce5c728e28e",  // commit hash
  "generatedAt": "2024-01-15T10:30:45.123Z",              // 生成时间
  "total": 1386,                                           // 模型总数
  "tree": {
    "label": "Live2d Models",
    "children": [
      {
        "label": "characters",
        "children": [
          {
            "label": "hiyori",
            "url": "https://raw.githubusercontent.com/...",
            "isLeaf": true
          }
        ]
      }
    ]
  }
}
```

## 常见问题

### 默认排除列表
脚本会在扫描仓库时自动排除一组已知的文件夹（默认生效）。默认排除项：

- 为美好的世界献上祝福！Fantastic Days
- destiny_child_kr 天命之子
- sin 七大 罪～魔王崇拜～
- Live2D
- VenusScramble
- Sacred Sword princesses
- 诺亚幻想
- 魂器学院 (炼铜学院)

你仍然可以通过 `--exclude` 传入额外的名称，脚本会将传入的排除项与默认列表合并并去重。例如：

```bash
node scripts/generate-models-list.cjs --exclude "temp,cache"
```

在上述命令中，`temp` 和 `cache` 会被追加到默认排除列表中。


### Q: 脚本运行很慢
A: 这是正常的。首次生成需要：
- 从 GitHub 克隆 ~2GB 的仓库（取决于网络速度）
- 解压大量 zip 文件
- 解析 ~2000 个 JSON 文件

可能需要 5-15 分钟。使用 `--dry-run` 仅检查版本（几秒钟）。

### Q: 已经生成过 models.json，为什么还要运行？
A: 仅在以下情况需要运行：
- Live2d-model 仓库有新的 commit（新模型、更新、删除）
- `models.json` 丢失或损坏
- 想要强制更新（使用 `--hash` 指定新版本）

使用脚本自动检查版本，避免不必要的重新生成。

### Q: 如何在 CI/CD 中使用？
A: 在 package.json 中添加脚本：

```json
{
  "scripts": {
    "generate-models": "node packages/webpaper/scripts/generate-models-list.cjs"
  }
}
```

在 CI 配置中运行：
```bash
npm run generate-models
```

### Q: 如何集成到 UI 中？
A: Live2D 组件现已移至 `@webtools/webwidget` 包。在你的 React 组件中：

```typescript
import { useLive2D } from '@webtools/webwidget';
import modelsData from '@webtools/webwidget/src/overlay/live2d/models.json';

export function ModelSelector() {
  return (
    <TreeSelect
      treeData={modelsData.tree.children}
      // ... 其他配置
    />
  );
}
```

## 技术细节

- **脚本位置**：`scripts/generate-models-list.cjs`
- **输出位置**：`packages/webwidget/src/overlay/live2d/models.json`
- **临时目录**：`/tmp/live2d-models-gen`（脚本完成后自动删除）
- **支持的模型版本**：Version 3 和 Version 4
- **URL 格式**：`https://raw.githubusercontent.com/Eikanya/Live2d-model/{commit}/{path}`

## 参考文档

更多详细信息，请参考：[scripts/README.md](./README.md)
