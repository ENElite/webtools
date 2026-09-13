# Widget 运行时

Widget 文档是规范化、可序列化的状态。引擎只接受经过 Schema 校验的 Widget definition，并通过事务修改文档。事务同时产生新的快照和历史项，因此不存在 Store 与命令对象之间的双写。

React Canvas 从引擎读取快照，交互结束后再提交布局事务。具体 view 和 inspector 通过两个显式 catalog 注入；应用可以只注册它实际允许的 Widget 类型。

## 运行时信号与槽

加载进度、统一时间和组件消息属于瞬态运行状态，不写入 Widget 文档，也不进入撤销历史。`@webtools/widget-core` 提供类型化的 `SignalHub`，应用为每个页面会话创建一个实例，再通过 `WidgetRuntimeProvider` 注入所有 view。Hub 同步分发信号，单个槽抛错不会中断其他槽。

每个组件使用稳定的命名空间 ID，例如 `widget:<id>`、`surface:background` 和 `surface:standby`。资源加载使用统一的四类信号：

1. `component.load.start` 创建带 `resourceKey` 和 `attemptId` 的加载尝试；
2. `component.load.progress` 发布当前尝试的进度；
3. `component.load.complete` 结算成功；
4. `component.load.error` 结算失败。

异步 view 通过 `readinessKey` 标识真实资源，并从图片、视频、iframe 或运行时的原生回调调用 `onReady`、`onError`、`onProgress`。同步 view 由 Canvas 在 passive effect 中自动完成。新的 resource key、同资源重试和 React StrictMode effect 重放都会产生新的 attempt；旧回调不能结算新 attempt。

WebPaper 把背景和待机遮罩视为特殊组件。首屏 barrier 在会话创建时冻结“背景 + 初始 Widget”成员，只通过加载信号聚合状态，并保留最终快照供晚挂载的待机遮罩读取。待机遮罩不接收 `widgetsReady` 一类业务布尔值；它在 barrier 完成或硬超时后播放退场动画，并发布自己的完成信号。页面加载完成后新增的 Widget 仍发布生命周期，但不会重新打开首屏遮罩。

跨组件通信继续使用同一个 hub：时钟订阅 `component.time.tick`，因此页面只有一个时间源；一般消息使用 `component.message` 的 `topic` 和可选 `target`。组件只连接自己需要的槽，不直接引用发送方。

安全边界由组件 definition 实现：HTML 在 sandboxed iframe 的 `srcDoc` 中运行，URL iframe 只接受 HTTP(S)，sandbox 权限由代码固定而不是由持久化数据控制。
