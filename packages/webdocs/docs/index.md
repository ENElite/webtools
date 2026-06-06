---
layout: home

hero:
    name: WebTools
    text: 桌面小组件引擎与图片浏览器
    tagline: 基于 React + Next.js 的可扩展桌面小组件系统，支持拖拽、缩放、动画、撤销/重做与 AI 编辑
    actions:
        - theme: brand
          text: 快速开始
          link: /guide/
        - theme: alt
          text: 架构设计
          link: /guide/architecture

features:
    - title: 小组件引擎
      details: 可复用的 Overlay 系统，支持 8 种小组件类型、拖拽/缩放/旋转、百分比布局与吸附辅助线
    - title: 命令模式
      details: 完整的撤销/重做支持，所有小组件操作均通过 Command 接口封装，支持批量操作
    - title: 信号系统
      details: 类型安全的发布/订阅总线，解耦小组件状态变化与动画/运行时响应
    - title: 声明式动画
      details: 11 种动画预设（淡入淡出、滑动、缩放、故障等），基于 Framer Motion 的运行时编译
    - title: Schema 驱动的设置 UI
      details: 通过 InspectorSchema 声明式定义属性编辑器，动态渲染 14 种编辑器组件
    - title: AI 集成
      details: 集成 DeepSeek AI，支持通过自然语言编辑小组件属性，内置 Agent 对话系统
---
