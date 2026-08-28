# Widget 运行时

Widget 文档是规范化、可序列化的状态。引擎只接受经过 Schema 校验的 Widget definition，并通过事务修改文档。事务同时产生新的快照和历史项，因此不存在 Store 与命令对象之间的双写。

React Canvas 从引擎读取快照，交互结束后再提交布局事务。具体 view 和 inspector 通过两个显式 catalog 注入；应用可以只注册它实际允许的 Widget 类型。

安全边界由组件 definition 实现：HTML 在 sandboxed iframe 的 `srcDoc` 中运行，URL iframe 只接受 HTTP(S)，sandbox 权限由代码固定而不是由持久化数据控制。
