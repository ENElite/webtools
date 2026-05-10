// adapter-registry.ts

import { KonachanAdapter } from "./konachan/adapter"
import { BirdPaperAdapter } from "./bird/adapter"
import { JsonAdapter } from './json/adapter'
import { ApiAdapter, Provider } from "./types"

const registry = new Map<Provider, ApiAdapter>()

export function registerAdapter(adapter: ApiAdapter) {
    registry.set(adapter.provider, adapter)
}

export function getAdapter(provider: Provider): ApiAdapter {
    const adapter = registry.get(provider)
    if (!adapter) throw new Error(`No adapter registered for "${provider}"`)
    return adapter
}

// 应用初始化时注册
registerAdapter(KonachanAdapter)
registerAdapter(BirdPaperAdapter)
registerAdapter(JsonAdapter)