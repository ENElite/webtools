# models.json 生成脚本 - 排除列表功能

## 功能概述

修改后的 `scripts/generate-models-list.cjs` 脚本现在支持排除列表功能。您可以指定要排除的文件夹名称，脚本将跳过这些文件夹及其所有子文件夹。

## 使用方法

### 基本语法

```bash
node scripts/generate-models-list.cjs --exclude "folder1,folder2,folder3"
```

### 参数说明

- `--exclude <names>`: 指定要排除的文件夹名称，多个名称用逗号分隔。文件夹名称在路径中任意位置匹配时，该路径及其所有子路径都会被跳过。

### 示例

**示例 1：排除单个文件夹**
```bash
node scripts/generate-models-list.cjs --exclude "temp"
```
这将排除所有名为 `temp` 的文件夹，包括：
- `temp/model.json`
- `folder/temp/model.json`
- `folder1/folder2/temp/subfolder/model.json`

**示例 2：排除多个文件夹**
```bash
node scripts/generate-models-list.cjs --exclude "temp,cache,node_modules"
```
这将排除名为 `temp`、`cache` 或 `node_modules` 的所有文件夹。

**示例 3：结合其他参数**
```bash
node scripts/generate-models-list.cjs \
  --exclude "temp,cache" \
  --print-tree \
  --tree-depth 2
```
这将排除 `temp` 和 `cache` 文件夹，并显示树形结构（深度为 2 级）。

**示例 4：指定输出路径和排除列表**
```bash
node scripts/generate-models-list.cjs \
  --output ./custom-models.json \
  --exclude "temp,old,deprecated"
```

## 工作原理

1. **参数解析**: 脚本在启动时解析 `--exclude` 参数，将逗号分隔的值转换为数组。
2. **路径过滤**: 在扫描仓库文件时，对每个文件路径检查其所有路径段（使用 `/` 分隔）。
3. **跳过匹配**: 如果路径中的任意段存在于排除列表中，该文件及其包含的整个目录树都会被跳过。
4. **树形显示**: 当使用 `--print-tree` 参数时，排除列表中的文件夹也不会出现在树形显示中。

## 实现细节

### 新增函数

```javascript
function shouldExcludePath(filePath, excludeList) {
  // 检查文件路径中是否包含排除列表中的任何文件夹名称
  // 返回 true 表示应该排除该路径
}
```

### 修改的函数

1. **parseArgs()**: 添加排除列表参数解析
2. **collectRepoIndex()**: 在文件扫描循环中添加排除逻辑
3. **printRepositoryTree()**: 在树形构建中添加排除逻辑
4. **printHelp()**: 更新帮助文档

## 技术细节

- **排除方式**: 基于文件夹名称的精确匹配（区分大小写）
- **应用范围**: 排除列表应用于路径的所有级别，不仅是顶级文件夹
- **性能**: 排除逻辑在文件扫描时应用，减少不必要的处理
- **不影响缓存**: 排除列表仅影响当前生成，不会改变模型 JSON 缓存

## 测试

脚本包含综合的排除逻辑测试。您可以运行以下命令验证功能：

```bash
# 测试排除逻辑
node test-exclude.js

# 测试参数解析
node test-parseargs.js
```

## 常见用例

1. **排除临时文件夹**
   ```bash
   node scripts/generate-models-list.cjs --exclude "temp,cache"
   ```

2. **排除开发文件**
   ```bash
   node scripts/generate-models-list.cjs --exclude "node_modules,.git,build"
   ```

3. **排除特定的模型集合**
   ```bash
   node scripts/generate-models-list.cjs --exclude "deprecated,legacy,old_format"
   ```

4. **生成仅包含特定模型的列表**
   ```bash
   # 如果所有模型都在特定的文件夹结构中，排除其他的
   node scripts/generate-models-list.cjs --exclude "unused"
   ```

## 向后兼容性

此更改完全向后兼容。如果不指定 `--exclude` 参数，脚本将按原来的方式工作。
