# models.json 生成脚本 - FileReferences 路径校验

## 校验规则

models.json 生成脚本现在包含以下 FileReferences 路径校验规则：

### 1. 路径存在性检查
- **规则**: FileReferences 中引用的文件必须存在于仓库中
- **处理**: 如果文件不存在，则按照现有规则处理（Textures 或 Moc 缺失会导致模型被跳过）

### 2. 路径中禁止包含 `#` 号
- **规则**: FileReferences 中的任何路径都不能包含 `#` 字符
- **原因**: `#` 号通常用作 URL 锚点/哈希，可能导致模型加载时出现问题
- **处理方式**:
  - **在 `--no-download` 模式**: 检测到包含 `#` 号的路径会跳过整个模型
  - **在普通模式**: 检测到包含 `#` 号的路径会记录警告并跳过该模型

## 实现细节

### 新增函数

```javascript
function hasHashInPath(fileReference) {
  return typeof fileReference === 'string' && fileReference.includes('#');
}
```

### 校验流程

1. **解析 FileReferences**: 从模型的 JSON 配置中提取所有文件引用
2. **遍历字段**: 对 FileReferences 中的每个字段进行检查
3. **提取值**: 使用 `collectStringLeaves` 递归提取所有字符串值
4. **检查 `#` 号**: 
   - 如果发现包含 `#` 号的路径，标记该字段为无效
   - 如果存在这样的字段，跳过整个模型

## 日志示例

### 检测到包含 `#` 号的路径

```
[warn] InvalidPath <Moc,Textures> (contains '#'): /folder/model/settings.json
```

这表示 `Moc` 或 `Textures` 字段中包含了 `#` 号。

## 测试示例

以下是会被跳过的模型配置示例：

```json
{
  "FileReferences": {
    "Moc": "model.moc3#badanchor",
    "Textures": ["texture.png"]
  }
}
```

以下是有效的模型配置示例：

```json
{
  "FileReferences": {
    "Moc": "model.moc3",
    "Textures": ["texture1.png", "texture2.png"]
  }
}
```

## 向后兼容性

此更改是一个校验增强，不影响现有的排除列表功能或其他选项。

## 常见问题

**Q: 为什么禁止路径中包含 `#` 号？**

A: `#` 号在 URL 中有特殊含义（表示锚点/哈希），可能导致模型加载系统出现问题。通常在文件路径中不应该包含此字符。

**Q: 现有模型中有包含 `#` 号的路径会怎样？**

A: 这些模型将被识别为无效并跳过。您需要修正这些模型配置文件中的路径。

**Q: 这个规则是否适用于 URL 引用？**

A: 是的，规则适用于所有 FileReferences 中的值。如果您的模型使用 URL 引用并包含锚点，应该考虑修正它们。
