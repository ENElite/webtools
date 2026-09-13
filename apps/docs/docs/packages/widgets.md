# Widget packages

原 `@webtools/webwidget` 已拆分为三个职责单一的包。

## `@webtools/widget-core`

纯 TypeScript 内核，提供 Widget 文档 Schema、catalog 定义、事务引擎、撤销/重做，以及类型化 signal hub、组件加载端口和 barrier。它不依赖 React，不访问 DOM，也不包含具体应用的小组件。

## `@webtools/widget-react`

React Canvas 运行时，负责：

- 将核心文档渲染为 Widget frame；
- 布局的像素/相对值换算；
- 选择、拖拽、缩放与错误隔离；
- 通过显式 catalog 绑定 Widget view。
- 将应用 signal hub 传给 view，并把同步或异步 view 的加载回调转换为组件生命周期信号。

## `@webtools/widget-studio`

编辑器层，提供 Schema 驱动的 Inspector、Widget 列表、状态 Devtools，以及 Monaco/AI 代码编辑。它依赖 React 运行时，但运行时不反向依赖 Studio。

## 应用内置组件

WebPaper 自己声明 text、clock、image、video、iframe 和 HTML Widget 的 definition、view 与 inspector。这样组件能力和安全策略归应用所有，导入模块不会悄悄修改全局注册表。
