# @webtools/webtest — 集中测试

`webtest` 是一个专用的测试包，通过 Vitest 路径别名同时测试 `webpaper` 和 `webwidget` 的源码。

## 为什么需要独立测试包

- 避免在每个包中重复配置测试环境
- 统一覆盖率报告，覆盖所有包的源码
- 集中管理 mock 和测试工具

## 配置

```typescript
// vitest.config.ts
export default defineConfig({
    resolve: {
        alias: {
            '@webpaper': resolve(__dirname, '../webpaper'),
            '@webwidget': resolve(__dirname, '../webwidget'),
            'l2d': resolve(__dirname, './__test__/mocks/l2d.ts'),
        },
    },
    test: {
        environment: 'jsdom',
        pool: 'threads',
        maxWorkers: 2,
        coverage: {
            provider: 'v8',
            all: true,
            include: [
                '../webpaper/**/*.{ts,tsx}',
                '../webwidget/**/*.{ts,tsx}',
            ],
        },
    },
})
```

## 测试文件

### webpaper 测试（15 个）

| 测试文件 | 测试内容 |
|----------|----------|
| `ProviderManager.test.ts` | 提供者管理器 |
| `font_picker.test.ts` | 字体选择器 |
| `hero.image.test.tsx` | 图片展示组件 |
| `image_virtual_grid.test.tsx` | 虚拟图片网格 |
| `live2d_settings_encoding.test.ts` | Live2D 设置编码 |
| `overlay_commands.test.ts` | Overlay 命令 |
| `konachan.test.ts` | Konachan 适配器 |
| `recordStore.test.ts` | Record Store |
| `registry.test.ts` | 适配器注册表 |
| `settings_utils.test.ts` | 设置工具函数 |
| `transform_utils.test.ts` | 变换工具函数 |
| `useFetch.test.tsx` | useFetch Hook |
| `use_local_fonts.test.tsx` | useLocalFonts Hook |
| `use_playback_scheduler.test.tsx` | 播放调度 Hook |
| `widget.autoHide.test.tsx` | 小组件自动隐藏 |
| `widget_dynamic_form.test.tsx` | 动态表单 |

### webwidget 测试（8 个）

| 测试文件 | 测试内容 |
|----------|----------|
| `font_picker.test.ts` | 字体选择器 |
| `overlay_commands.test.ts` | Overlay 命令 |
| `registry.test.ts` | 编辑器注册表 |
| `settings_utils.test.ts` | 设置工具函数 |
| `transform_utils.test.ts` | 变换工具函数 |
| `use_local_fonts.test.tsx` | useLocalFonts Hook |
| `use_playback_scheduler.test.tsx` | 播放调度 Hook |
| `widget.autoHide.test.tsx` | 小组件自动隐藏 |

### Mock

- `mocks/l2d.ts` — l2d Live2D 库的 mock 实现

## 运行测试

```bash
cd packages/webtest

# 单次运行
pnpm test

# 监听模式
pnpm test:watch
```
