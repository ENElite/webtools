import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { enableMapSet } from 'immer'
import { getAdapter } from '@/providers'
import type { ProviderRecord } from '@/providers'
import { Provider } from '@/providers/types';

enableMapSet()


interface QueryState {
    key: string
    provider: Provider;
    api: string
    params: Record<string, unknown>
    ids: string[]
    deletedIds: Set<string>
    nextPage: number
    hasMore: boolean
    loading: boolean
    error: string | null
    loadedAt: number | null
    requestId: number
}

interface RecordState {
    // 数据层
    entities: Record<string, ProviderRecord>
    queries: Record<string, QueryState>

    // 导航层
    activeKey: string | null
    cursor: number
    // 历史浏览
    history: ProviderRecord[]
    historyCursor: number | null

    // 派生数据（selectors）
    currentQuery: () => QueryState | null
    currentRecord: () => ProviderRecord | null
    getHistory: () => ProviderRecord[]
    goToHistory: (pos: number) => void
    returnToCurrent: () => void

    // 查询管理
    switchQuery: (provider: Provider, api: string, params: Record<string, unknown>) => void
    invalidateQuery: (key: string) => void
    invalidateAll: () => void

    // 数据加载
    hasMore: () => boolean
    loadMore: () => Promise<void>
    // loadAll: () => Promise<void>

    // 导航
    navigate: (delta?: number) => Promise<void>
    peek: (delta?: number) => Promise<ProviderRecord | null>
    goToFirst: () => void
    // goToLast: () => Promise<void>

    // 数据操作
    getRecord: (id: string) => ProviderRecord | null
    removeRecord: (localIdx: number, broadcast?: boolean) => void
    updateRecord: (id: string, patch: Partial<ProviderRecord>) => void

    // 内部工具
    _buildKey: (provider: Provider, api: string, params: Record<string, unknown>) => string
    _fixCursor: (deletedLocalIdx: number) => void
    _ensureLoaded: (globalIdx: number) => Promise<void>
}

const CACHE_TTL = 5 * 60 * 1000
// const PAGE_SIZE = 10
const PREFETCH_THRESHOLD = 2

export const useRecordStore = create<RecordState>()(immer((
    set: (fn: (state: RecordState) => void) => void,
    get: () => RecordState
) => ({
    entities: {},
    queries: {},
    activeKey: null,
    cursor: 0,
    history: [],
    historyCursor: null,

    // ─── selectors ────────────────────────────────────────────────────────────

    /**
     * 返回当前激活的 QueryState，没有激活查询时返回 null
     */
    currentQuery: () => {
        const { activeKey, queries } = get();
        return activeKey ? queries[activeKey] ?? null : null
    },

    getHistory: () => {
        return get().history.slice()
    },

    /**
     * 返回当前实体：当处于历史浏览时返回历史中的项；否则返回当前 query 中 cursor 指向的项
     * 每次 live 模式下读取当前实体时，会把该实体加入 history（避免连续重复 id）
     */
    currentRecord: () => {
        const historyCursor = get().historyCursor
        if (typeof historyCursor === 'number') {
            const h = get().history[historyCursor] ?? null
            console.log('[recordStore] currentRecord(history):', { historyCursor, hasRecord: !!h, recordId: h?.id })
            return h
        }

        const q = get().currentQuery()
        if (!q) {
            console.log('[recordStore] currentRecord: no active query')
            return null
        }

        const items = q.ids
            .filter(id => !q.deletedIds.has(id))
            .map(id => get().entities[id])
            .filter((item): item is ProviderRecord => Boolean(item))

        const cursor = get().cursor
        const record = items[cursor] ?? null
        console.log('[recordStore] currentRecord:', { totalItems: items.length, cursor, hasRecord: !!record, recordId: record?.id })

        if (record) {
            const history = get().history
            if (history.length === 0 || history.at(-1)!.id !== record.id) {
                set(state => { state.history.push(record) })
            }
        }

        return record
    },

    // ─── 查询管理 ──────────────────────────────────────────────────────────────

    /**
     * 切换当前激活的查询
     * - 已有缓存且未过期：直接激活，不重新请求
     * - 已有缓存但已过期：保留 deletedIds，重置分页状态，重新加载第一页
     * - 全新查询：初始化 QueryState，立即加载第一页
     * cursor 始终归零
     */
    switchQuery: (provider, api, params) => {
        const key = get()._buildKey(provider, api, params)
        const now = Date.now()
        console.log('[recordStore] switchQuery:', { key, provider, api, params })

        set(state => {
            state.activeKey = key
            state.cursor = 0

            if (!state.queries[key]) {
                state.queries[key] = {
                    provider, key, api, params,
                    ids: [], deletedIds: new Set(),
                    nextPage: 1, hasMore: true,
                    loading: false, error: null,
                    loadedAt: null, requestId: 0,
                }
                console.log('[recordStore] created new query:', key)
            } else if (state.queries[key].loadedAt &&
                now - state.queries[key].loadedAt! > CACHE_TTL) {
                // 缓存过期：只重置分页，保留 deletedIds（用户的删除操作不应随缓存失效消失）
                state.queries[key].ids = []
                state.queries[key].nextPage = 1
                state.queries[key].hasMore = true
                state.queries[key].loadedAt = null
                state.queries[key].error = null
                console.log('[recordStore] cache expired, resetting query:', key)
            } else {
                console.log('[recordStore] using cached query:', key)
            }
        })

        // 新查询或缓存过期时自动加载第一页
        const q = get().queries[key]
        if (q && !q.loadedAt && !q.loading) {
            console.log('[recordStore] auto loading first page for query:', key)
            get().loadMore()
        }
    },

    /**
     * 手动使某个查询的缓存失效
     * 下次 switchQuery 或 loadMore 时将重新请求
     */
    invalidateQuery: (key) => {
        set(state => {
            if (state.queries[key]) {
                state.queries[key].ids = []
                state.queries[key].nextPage = 1
                state.queries[key].hasMore = true
                state.queries[key].loadedAt = null
            }
        })
    },

    /**
     * 使所有查询缓存失效（适用于全局数据刷新场景）
     */
    invalidateAll: () => {
        Object.keys(get().queries).forEach(key => get().invalidateQuery(key))
    },

    // ─── 数据加载 ──────────────────────────────────────────────────────────────

    /**
     * 加载当前查询的下一页数据，追加到 ids 末尾
     * - 并发安全：用 requestId 防止过期响应写入
     * - 后台加载：即使切换了查询，数据也会写入对应 key 的缓存
     * - 去重：新数据的 id 若已存在于 ids 中，不重复追加
     * - 过滤：deletedIds 中的条目从新数据里剔除（防止后端重新返回已删数据）
     */
    loadMore: async () => {
        const { activeKey, queries } = get()
        if (!activeKey) return

        const q = queries[activeKey]
        if (!q || q.loading || !q.hasMore) return

        const myRequestId = q.requestId + 1
        set(state => {
            state.queries[activeKey]!.loading = true
            state.queries[activeKey]!.error = null
            state.queries[activeKey]!.requestId = myRequestId
        })

        try {
            const adapter = getAdapter(q.provider)
            console.log('[recordStore] fetching data for query:', activeKey, 'page:', q.nextPage)
            const { data, hasMore } = await adapter.fetch(q.api, q.params, q.nextPage)
            console.log('[recordStore] fetch result:', { count: data.length, hasMore, activeKey })

            set(state => {
                const current = state.queries[activeKey]!
                // 请求已被更新的请求覆盖，丢弃此响应
                if (current.requestId !== myRequestId) {
                    console.log('[recordStore] stale request, discarding:', activeKey)
                    return
                }

                try {
                    const beforeCount = current.ids.length
                    console.log('[recordStore] before merge:', { beforeCount, currentIdsType: typeof current.ids, isArray: Array.isArray(current.ids) })

                    // 直接在当前 set 中合并数据，避免嵌套 set
                    data.forEach(item => {
                        state.entities[item.id] = item
                    })
                    console.log('[recordStore] entities merged:', { dataCount: data.length, entitiesAfterSize: Object.keys(state.entities).length })

                    const existingIds = new Set(current.ids)
                    console.log('[recordStore] existingIds set created:', { existingIdsSize: existingIds.size })

                    const itemsToAdd = data
                        .filter(item => !current.deletedIds.has(item.id) && !existingIds.has(item.id))
                    console.log('[recordStore] items to add after filter:', { count: itemsToAdd.length })

                    itemsToAdd.forEach(item => {
                        console.log('[recordStore] pushing item:', item.id)
                        current.ids.push(item.id)
                    })

                    console.log('[recordStore] merged data:', { beforeCount, afterCount: current.ids.length, newItemsAdded: current.ids.length - beforeCount })

                    current.hasMore = hasMore
                    current.nextPage += 1
                    current.loadedAt = Date.now()
                    current.loading = false
                } catch (err) {
                    console.error('[recordStore] error during merge:', err)
                    throw err
                }
            })
        } catch (err) {
            set(state => {
                if (state.queries[activeKey]!.requestId === myRequestId) {
                    state.queries[activeKey]!.loading = false
                    state.queries[activeKey]!.error = (err as Error).message
                }
            })
        }
    },


    /**
     * 检查当前查询是否还有更多数据可加载
     * 由当前查询的 hasMore 字段决定，调用前应先检查 currentQuery() 是否为 null
     */
    hasMore: () => {
        const { activeKey, queries } = get()
        if (!activeKey) return false

        const q = queries[activeKey]
        if (!q || q.loading || !q.hasMore) return false

        return q.hasMore;
    },

    /**
     * 加载当前查询的全部数据（用于"跳到最后"等需要全量数据的操作）
     * 若数据量过大会很慢，调用前应在 UI 层做限制或给用户提示
     */
    // loadAll: async () => {
    //     while (get().currentQuery()?.hasMore) {
    //         await get().loadMore()
    //     }
    // },

    // ─── 导航 ──────────────────────────────────────────────────────────────────

    /**
     * 相对移动光标
     * delta = +1 下一个，delta = -1 上一个
     * 接近末尾时（距末尾 < PREFETCH_THRESHOLD）自动后台预加载下一页
     */
    navigate: async (delta = 1) => {
        // 仅允许 +-1
        if (delta !== 1 && delta !== -1) return

        const q = get().currentQuery()
        if (!q) return

        const items = q.ids
            .filter(id => !q.deletedIds.has(id))
            .map(id => get().entities[id])
            .filter((item): item is ProviderRecord => Boolean(item))

        const next = get().cursor + delta
        if (next < 0 || next >= items.length) return

        set(state => { state.cursor = next })

        if (q.hasMore && items.length - next <= PREFETCH_THRESHOLD) {
            get().loadMore()  // 不 await，静默后台加载
        }
    },

    /**
     * 预览相对位置的实体但不移动光标
     * delta = +1 预览下一个，delta = -1 预览上一个
     */
    peek: async (delta = 1) => {
        if (delta !== 1 && delta !== -1) return null
        const q = get().currentQuery()
        if (!q) return null
        const items = q.ids
            .filter(id => !q.deletedIds.has(id))
            .map(id => get().entities[id])
            .filter((item): item is ProviderRecord => Boolean(item))
        const peekIndex = get().cursor + delta
        if (peekIndex < 0 || peekIndex >= items.length) return null
        return items[peekIndex] ?? null
    },

    /**
     * 跳到第一个（不触发加载）
     */
    goToFirst: () => {
        set(state => { state.cursor = 0 })
    },

    /**
     * 跳到最后一个
     * 若还有未加载的数据，先全量加载再定位
     */
    // goToLast: async () => {
    //     await get().loadAll()
    //     set(state => {
    //         state.cursor = Math.max(0, get().currentItems().length - 1)
    //     })
    // },

    /**
     * 跳到指定的本地下标
     * 若目标下标超出已加载范围，先补充加载再定位
     */
    // goToIndex 已移除；请使用历史相关 API 或 navigate(+1/-1)

    // ─── 数据操作 ──────────────────────────────────────────────────────────────

    /**
     * 从当前查询的视图中移除一个条目（纯前端软删除）
     * broadcast = true 时同步到所有其他查询的 deletedIds（适用于"彻底不想看到"语义）
     * broadcast = false（默认）时只影响当前查询（适用于"从这个结果里移除"语义）
     * cursor 根据被删位置自动修正
     */
    removeRecord: (localIdx, broadcast = false) => {
        const q = get().currentQuery()
        if (!q) return
        const items = q.ids
            .filter(id => !q.deletedIds.has(id))
            .map(id => get().entities[id])
            .filter((item): item is ProviderRecord => Boolean(item))
        const item = items[localIdx]
        if (!item) return

        set(state => {
            const key = state.activeKey!
            state.queries[key]!.deletedIds.add(item.id)

            if (broadcast) {
                Object.values(state.queries).forEach((q) => {
                    if (q.key !== key) q.deletedIds.add(item.id)
                })
            }
        })

        get()._fixCursor(localIdx)
    },

    /**
     * 更新实体表中某个实体的字段（乐观更新）
     * 由于所有查询共享实体表，更新一次即全局生效
     */
    updateRecord: (id, patch) => {
        set(state => {
            if (state.entities[id]) {
                Object.assign(state.entities[id], patch)
            }
        })
    },


    /**
     * 根据 id 获取实体，找不到时返回 null
     */
    getRecord: (id) => {
        return get().entities[id] ?? null
    },

    // ─── 历史浏览 API ───────────────────────────────────────────────────────
    goToHistory: (pos) => {
        const h = get().history
        if (h.length === 0) return
        const idx = Math.max(0, Math.min(pos, h.length - 1))
        set(state => { state.historyCursor = idx })
    },

    returnToCurrent: () => {
        set(state => { state.historyCursor = null })
    },

    // ─── 内部工具 ──────────────────────────────────────────────────────────────

    /**
     * 将 api 名和参数对象序列化为稳定的查询 key
     * 参数 key 按字母排序，保证 {a:1,b:2} 和 {b:2,a:1} 命中同一个缓存
     */
    _buildKey: (provider, api, params) => {
        const adapter = getAdapter(provider)
        const paramStr = adapter.serializeParams
            ? adapter.serializeParams(params)
            : JSON.stringify(Object.fromEntries(Object.keys(params).sort().map(k => [k, params[k]])))
        return `${provider}/${api}?${paramStr}`
    },

    /**
     * 删除操作后修正 cursor，保证光标指向有效位置
     * - 被删位置在光标前：cursor - 1
     * - 被删位置就是 cursor：cursor 不变，但夹紧到新列表末尾
     * - 被删位置在光标后：cursor 不变
     */
    _fixCursor: (deletedLocalIdx) => {
        const q = get().currentQuery()
        const itemCount = q ? q.ids.filter(id => !q.deletedIds.has(id)).length : 0
        set(state => {
            if (deletedLocalIdx < state.cursor) {
                state.cursor -= 1
            } else if (deletedLocalIdx === state.cursor) {
                state.cursor = Math.min(state.cursor, itemCount - 1)
            }
            state.cursor = Math.max(0, state.cursor)
        })
    },

    /**
     * 确保本地已加载到足够覆盖目标下标的数据
     * 循环加载直到 ids 长度超过目标下标或没有更多数据
     */
    _ensureLoaded: async (globalIdx) => {
        const getIds = () => get().currentQuery()?.ids ?? []
        while (getIds().length <= globalIdx && get().currentQuery()?.hasMore) {
            await get().loadMore()
        }
    },
})))