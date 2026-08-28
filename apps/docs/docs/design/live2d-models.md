# Live2D 模型生成脚本

## 概述

`scripts/generate-models-list.cjs` 是一个 Node.js 脚本，用于从 [Eikanya/Live2d-model](https://github.com/Eikanya/Live2d-model) GitHub 仓库自动扫描和生成 Live2D 模型目录列表（`models.json`），供 Live2D 小组件使用。

## 工作流程

```
┌─────────────────────────────────────────────────┐
│  1. 获取最新 commit hash                        │
│     git ls-remote / GitHub API fallback          │
├─────────────────────────────────────────────────┤
│  2. 版本检查                                     │
│     对比当前 models.json 的 version 字段         │
├─────────────────────────────────────────────────┤
│  3. 克隆/复用本地仓库                            │
│     浅克隆 --filter=blob:none --no-checkout      │
├─────────────────────────────────────────────────┤
│  4. 扫描文件树                                   │
│     git ls-tree -r -z --name-only                │
│     过滤压缩包、排除列表                         │
├─────────────────────────────────────────────────┤
│  5. 提取 model.json 文件                         │
│     匹配 *.model.json / *.model3.json / *.model4.json │
├─────────────────────────────────────────────────┤
│  6. 验证模型格式                                 │
│     检查 FileReferences、路径存在性、# 号校验     │
├─────────────────────────────────────────────────┤
│  7. 构建树形结构                                 │
│     按目录组织、展平单子节点链                   │
├─────────────────────────────────────────────────┤
│  8. 输出 models.json                             │
│     version + generatedAt + total + tree          │
└─────────────────────────────────────────────────┘
```

## 使用方式

### 基本命令

```bash
# 生成最新模型列表
node scripts/generate-models-list.cjs

# 试运行（不写入文件）
node scripts/generate-models-list.cjs --dry-run

# 交互选择 commit hash
node scripts/generate-models-list.cjs -i

# 指定 commit hash
node scripts/generate-models-list.cjs --hash 94ae3e5628226726af96c6b4bf0e1ce5c728e28e
```

### 通过 webpaper 脚本

```bash
cd packages/webpaper

pnpm generate-models            # 等效于 node ../../scripts/generate-models-list.cjs
pnpm generate-models:dry-run    # 试运行
pnpm generate-models:interactive # 交互模式
```

### 完整参数

| 参数 | 说明 |
|------|------|
| `-o, --output <path>` | 输出 JSON 路径 |
| `--hash <commit>` | 指定 commit hash |
| `-i, --interactive` | 交互式选择 commit |
| `--dry-run` | 仅扫描，不写入文件 |
| `--no-download` | 仅扫描文件树，跳过模型验证 |
| `--exclude <names>` | 排除文件夹（逗号分隔） |
| `--validate-references` | 校验 FileReferences 路径 |
| `--print-tree` | 打印仓库目录树 |
| `--print-models` | 打印所有扫描到的 model.json 路径 |
| `--tree-depth <n>` | 目录树深度（默认 1） |
| `--tree-limit <n>` | 每层最多显示条目（默认 3） |

## 输出格式

```json
{
  "version": "94ae3e5628226726af96c6b4bf0e1ce5c728e28e",
  "generatedAt": "2024-01-15T10:30:45.123Z",
  "total": 1386,
  "tree": {
    "label": "Live2D Models",
    "children": [
      {
        "label": "characters / hiyori",
        "url": "https://raw.githubusercontent.com/Eikanya/Live2d-model/94ae3e5.../characters/hiyori/model.model3.json"
      }
    ]
  }
}
```

| 字段 | 说明 |
|------|------|
| `version` | 生成所用的 commit hash |
| `generatedAt` | ISO 8601 生成时间 |
| `total` | 有效模型总数 |
| `tree` | 树形模型目录，叶节点包含 `url` 指向 raw.githubusercontent.com |

## 模型文件匹配

脚本匹配以下模式的文件：

```
/(?:[^/]+\.)?model(?:3|4)?\.json$/i
```

即 `*.model.json`、`*.model3.json`、`*.model4.json`，支持嵌套目录。

## 排除列表

### 默认排除项

脚本内置一组默认排除的文件夹名（扫描时自动跳过）：

| 文件夹名 |
|----------|
| 为美好的世界献上祝福！Fantastic Days |
| destiny_child_kr 天命之子 |
| sin 七大 罪～魔王崇拜～ |
| Live2D |
| VenusScramble |
| Sacred Sword princesses |
| 诺亚幻想 |
| 魂器学院 (炼铜学院) |

### 自定义排除

```bash
# 追加排除项（与默认列表合并去重）
node scripts/generate-models-list.cjs --exclude "temp,cache,node_modules"
```

排除逻辑：检查文件路径的每个段（`/` 分隔），如果任意段匹配排除列表中的名称，则跳过该文件及其所有子路径。

## 模型验证

### FileReferences 校验（`--validate-references`）

对于 Model3+ 格式（有 `FileReferences` 字段）：

1. 遍历 `FileReferences` 的所有字段
2. 递归提取所有字符串值
3. 检查路径是否包含 `#` 字符（URL 锚点）→ 跳过模型
4. 检查引用的文件是否存在于仓库中
5. 如果仅缺少 `Textures` 或 `Moc` → 跳过模型
6. 其他缺失文件 → 保留模型并记录日志

### Legacy 模型校验

对于旧版格式（无 `FileReferences`）：

1. 检查 `model` 字段
2. 检查 `textures` 数组
3. 检查 `physics` 字段
4. 递归检查所有 `file` 键
5. 验证 `#` 号和文件存在性

### `#` 号路径规则

路径中包含 `#` 字符的模型会被跳过，因为 `#` 在 URL 中表示锚点/哈希，可能导致模型加载失败。

## 本地仓库缓存

脚本会复用本地仓库缓存，避免重复克隆：

```
候选路径（按优先级）：
1. $LIVE2D_REPO_DIR 环境变量
2. /workspace/temp/Live2d-model
3. /workspaces/webtools/temp/Live2d-model
4. <项目根>/temp/Live2d-model（默认）
```

如果本地仓库不存在，脚本会自动克隆（`--filter=blob:none --no-checkout`，仅下载必要数据）。

## 模型 JSON 缓存

已读取的模型 JSON 文件会缓存到 `temp/model-json-cache/`，避免重复从 git blob 读取：

```
temp/model-json-cache/
├── characters/
│   └── hiyori/
│       └── model.model3.json        # 缓存的模型文件
│       └── model.model3.json.meta.json  # 缓存元数据
```

缓存元数据包含 `commitHash`，下次运行时自动判断是否需要重新读取。

## 树形结构优化

生成的树形结构会进行以下优化：

1. **展平单子节点链**：如果一个节点只有单个子节点且无 URL，合并标签（用 ` / ` 连接）
2. **移除空 children**：叶节点不保留空的 `children` 数组
3. **URL 继承**：展平时子节点的 URL 会继承到父节点

## CI/CD 集成

```bash
# 在 CI 中运行
node scripts/generate-models-list.cjs

# 检查是否有更新
node scripts/generate-models-list.cjs --dry-run
```
