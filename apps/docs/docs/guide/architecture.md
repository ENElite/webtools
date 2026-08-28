# 架构设计

## 工作区边界

```text
                              ┌──────────────────────┐
                              │ apps/webpaper       │
                              │ composition + BFF   │
                              └──────┬────────┬──────┘
                                     │        │
                         media ports │        │ widgets
                                     ▼        ▼
                          domain/application  widget-studio
                                     │        │
                                     ▼        ▼
                              infrastructure  widget-react
                                                │
                                                ▼
                                           widget-core
```

WebPaper 内部采用轻量的端口与适配器结构：

- `domain` 定义 `MediaItem`、`MediaSource` 和播放器会话，不导入 Next 或 React。
- `application` 组合媒体目录、设置和 Widget 文档存储。
- `infrastructure` 实现 BirdPaper、Konachan、JSON HTTP 适配器。
- `features` 是 React 展示与交互层。
- `app` 是 Next.js 组合根和受约束的 BFF。

不建立抽象的全局 Provider 注册表。组合根显式创建可用源，因此依赖、默认值和测试替身都可见。

## Widget 三层

`widget-core` 是状态真相来源。每次添加、删除、更新或布局变化都形成事务；引擎以不可变文档计算新状态，并维护有限的撤销/重做栈。

`widget-react` 订阅引擎快照，将相对布局换算为 Canvas 坐标，并将拖拽/缩放结果提交回事务。组件实现由调用方提供的 catalog 决定，包加载不会产生全局注册副作用。

`widget-studio` 只负责开发和编辑体验：Schema 表单、Inspector、Devtools、Monaco 与 AI 编辑。生产运行时可以只依赖前两层。

## 状态与持久化

媒体播放状态由一个可中止的 controller 管理；源切换、分页和自动播放不会并发写入多套 Store。请求具有会话令牌，过期响应会被忽略。

浏览器持久化只保存两类版本化数据：应用设置和 Widget 文档。读取时先通过 Zod 校验；旧结构不会在运行时做隐式兼容，而是回退并写入 v2 数据。

## 为什么没有 shared

原 `shared` 同时放置计时器、字体、预加载、窗口控制和 AI Hook，变化原因完全不同，并让应用依赖方向变得模糊。重构后：

- 应用专属逻辑留在应用；
- Widget 编辑逻辑进入 `widget-studio`；
- 纯 Widget 状态进入 `widget-core`；
- 没有真实复用方的 Hook 被删除。

未来只有出现稳定职责和多个真实消费者时才新增专用包，例如 `media-contracts`，不会恢复通用 `shared`。

## 为什么没有 webtest

集中测试包需要源码路径别名、跨包 mock 和对内部实现的深层导入，重构时很容易与所有者代码失配。现在测试与源码同目录，使用各工作区自己的环境；根配置仅聚合结果。跨应用端到端测试若以后出现，应放入明确的 `apps/e2e` 或 `tests/e2e`，而不是重新建立单元测试筒仓。
