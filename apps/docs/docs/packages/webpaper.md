# `@webtools/webpaper`

WebPaper 是 Next.js 16 应用，默认保留小鸟壁纸（BirdPaper）源，并支持 Konachan 与受控 JSON 源。

## 媒体数据流

```text
UI intent → MediaPlayerController → MediaSource port → HTTP adapter/BFF
                  │                       │
                  └── session token ◀──── normalized MediaItem[]
```

播放器请求可通过 `AbortController` 取消；旧请求即使稍后完成，也无法覆盖当前会话。历史记录保存标准化项目，不保存上游私有响应。

BirdPaper 路由位于 `/api/media/birdpaper`。它固定上游主机，校验 mode、分页与数量，只升级允许的 CDN URL，从而避免把服务端路由变成任意代理。Konachan 路由同样限制参数、超时和缓存。DeepSeek 只保留 `/api/deepseek/chat`，不再暴露任意 catch-all 代理。

## 目录

```text
apps/webpaper/
├── app/               # Next 组合根、页面和 BFF
└── src/
    ├── domain/        # 媒体实体、端口、播放会话
    ├── application/   # catalog、设置、Widget 文档存储
    ├── infrastructure/# HTTP 与媒体源适配器
    └── features/      # player、history、media、widgets UI
```

应用设置和 Widget 文档分别使用版本化 localStorage 键并通过 Zod 读取。v1 数据不做兼容迁移。
