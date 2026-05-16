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
    baseIndex: number
    pageSize: number
    canLoadPrev: boolean
    hasMore: boolean
    loading: boolean
    loadingPrev: boolean
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
    // 历史游标，-1 表示未进入历史模式
    historyCursor: number
    // 自动切换
    autoPlay: number | 'stop'
    autoPlayTimerId: number | null
    autoPlayInFlight: boolean
    pendingPreloadUrl: string | null
    // 查询切换过渡态（仅用于保证 currentRecord 输出稳定）
    querySwitching: boolean
    queryTransitionRecord: ProviderRecord | null

    // 派生数据（selectors）
    currentQuery: () => QueryState | null
    currentRecord: () => ProviderRecord | null
    getHistory: () => ProviderRecord[]
    goToHistory: (pos: number) => void
    returnToCurrent: () => void
    enterHistoryMode: () => void
    leaveHistoryMode: () => void
    isHistoryMode: () => boolean

    // 查询管理
    switchQuery: (provider: Provider, api: string, params: Record<string, unknown>) => void
    invalidateQuery: (key: string) => void
    invalidateAll: () => void

    // 数据加载
    hasMore: () => boolean
    hasPrev: () => boolean
    loadMore: () => Promise<void>
    // internal: 向前加载上一页，已内部化为 `_loadPrevious`
    _loadPrevious: () => Promise<void>
    // loadAll: () => Promise<void>

    // 导航：navigate 接受相对 delta（整数），0 表示刷新当前
    navigate: (delta: number) => Promise<void>
    next: () => Promise<void>
    // internal: 便捷向后导航（已内部化为 `_prev`）
    _prev: () => Promise<void>
    enableAutoPlay: (intervalSec: number) => void
    disableAutoPlay: () => void
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
    _getCurrentGlobalIndex: () => number
    _clearAutoPlayTimer: () => void
    _resetAutoPlayTimer: () => void
}

const CACHE_TTL = 5 * 60 * 1000
const PAGE_SIZE = 10
const PREFETCH_THRESHOLD = 2

export const useRecordStore = create<RecordState>()(immer((
    set, get
) => ({
    entities: {},
    queries: {},
    activeKey: null,
    cursor: 0,
    history: [],
    historyCursor: -1,
    autoPlay: 'stop',
    autoPlayTimerId: null,
    autoPlayInFlight: false,
    pendingPreloadUrl: null,
    querySwitching: false,
    queryTransitionRecord: null,

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
     * 注意：不在此处修改 history，由调用方决定是否添加到历史记录
     */
    currentRecord: () => {
        const historyCursor = get().historyCursor
        if (historyCursor !== -1) {
            return get().history[historyCursor] ?? null
        }

        const transitionRecord = get().queryTransitionRecord
        if (get().querySwitching && transitionRecord) {
            return transitionRecord
        }

        const q = get().currentQuery()
        if (!q) {
            return null
        }

        const items = q.ids
            .filter(id => !q.deletedIds.has(id))
            .map(id => get().entities[id])
            .filter((item): item is ProviderRecord => Boolean(item))

        return items[get().cursor] ?? null
    },

    // ─── 查询管理 ──────────────────────────────────────────────────────────────

    /**
     * 切换当前激活的查询
     * - 已有缓存且未过期：直接激活，不重新请求
     * - 已有缓存但已过期：保留 deletedIds，重置数据状态，重新加载第一页
     * - 全新查询：初始化 QueryState，立即加载第一页
     * cursor 始终归零，baseIndex 从 0 开始（对应第1页）
     */
    switchQuery: (provider, api, params) => {
        const key = get()._buildKey(provider, api, params)
        const now = Date.now()
        const prevRecord = get().currentRecord()
        console.log('[recordStore] switchQuery:', { key, provider, api, params })

        set(state => {
            state.activeKey = key
            state.cursor = 0
            state.historyCursor = -1
            state.querySwitching = true
            state.queryTransitionRecord = prevRecord

            const pageParam = params?.['page']
            const initialBase = (typeof pageParam === 'number' && Number.isInteger(pageParam) && pageParam > 0)
                ? Math.max(0, (pageParam - 1) * PAGE_SIZE)
                : 0

            if (!state.queries[key]) {
                state.queries[key] = {
                    provider, key, api, params,
                    ids: [], deletedIds: new Set(),
                    baseIndex: initialBase, pageSize: PAGE_SIZE,
                    canLoadPrev: initialBase > 0, hasMore: true,
                    loading: false, loadingPrev: false,
                    error: null,
                    loadedAt: null, requestId: 0,
                }
                console.log('[recordStore] created new query:', key, 'baseIndex:', initialBase)
            } else if (state.queries[key].loadedAt &&
                now - state.queries[key].loadedAt! > CACHE_TTL) {
                // 缓存过期：只重置分页，保留 deletedIds（用户的删除操作不应随缓存失效消失）
                state.queries[key].ids = []
                state.queries[key].baseIndex = initialBase
                state.queries[key].canLoadPrev = initialBase > 0
                state.queries[key].hasMore = true
                state.queries[key].loadedAt = null
                state.queries[key].error = null
                console.log('[recordStore] cache expired, resetting query:', key)
            } else {
                console.log('[recordStore] using cached query:', key)
            }

            const nextQuery = state.queries[key]
            const hasUsableCache = Boolean(nextQuery.loadedAt && nextQuery.ids.length > 0)
            if (hasUsableCache) {
                state.querySwitching = false
                state.queryTransitionRecord = null
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
                state.queries[key].baseIndex = 0
                state.queries[key].canLoadPrev = false
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

    // ─── 历史模式管理 ──────────────────────────────────────────────────────────

    enterHistoryMode: () => {
        const h = get().history
        if (h.length === 0) return
        set(state => {
            state.historyCursor = h.length - 1
        })
    },

    leaveHistoryMode: () => {
        set(state => {
            state.historyCursor = -1
        })
    },

    isHistoryMode: () => {
        return get().historyCursor !== -1
    },

    // ─── 数据加载 ──────────────────────────────────────────────────────────────

    /**
     * 加载当前查询的下一页数据，追加到 ids 末尾
     * - 页码计算：nextPage = Math.floor((baseIndex + ids.length) / PAGE_SIZE) + 1
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
            // 计算下一页页码
            const nextPageNum = Math.floor((q.baseIndex + q.ids.length) / PAGE_SIZE) + 1
            console.log('[recordStore] fetching data for query:', activeKey, 'page:', nextPageNum, 'baseIndex:', q.baseIndex, 'idsLen:', q.ids.length)
            const { data, hasMore } = await adapter.fetch(q.api, q.params, nextPageNum)
            console.log('[recordStore] fetch result:', { count: data.length, hasMore, activeKey })

            set(state => {
                const current = state.queries[activeKey]!
                const beforeCount = current.ids.length
                // 请求已被更新的请求覆盖，丢弃此响应
                if (current.requestId !== myRequestId) {
                    console.log('[recordStore] stale request, discarding:', activeKey)
                    return
                }

                try {
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
                    current.loadedAt = Date.now()
                    current.loading = false

                    if (state.activeKey === activeKey && state.querySwitching) {
                        state.querySwitching = false
                        state.queryTransitionRecord = null
                    }

                    if (beforeCount === 0 && state.historyCursor === -1) {
                        const currentRecord = current.ids
                            .filter(id => !current.deletedIds.has(id))
                            .map(id => state.entities[id])
                            .find((item): item is ProviderRecord => Boolean(item))
                        if (currentRecord && (state.history.length === 0 || state.history.at(-1)!.id !== currentRecord.id)) {
                            state.history.push(currentRecord)
                        }
                    }
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
                    if (state.activeKey === activeKey && state.querySwitching) {
                        state.querySwitching = false
                        state.queryTransitionRecord = null
                    }
                }
            })
        }
    },


    /**
     * 检查当前查询是否还有更多数据可加载（向后）
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
     * 检查当前查询是否还有更多数据可加载（向前）
     * 由当前查询的 canLoadPrev 字段决定
     */
    hasPrev: () => {
        const { activeKey, queries } = get()
        if (!activeKey) return false

        const q = queries[activeKey]
        if (!q || q.loadingPrev || !q.canLoadPrev) return false

        return q.canLoadPrev;
    },

    /**
     * 加载当前查询的前一页数据，插入到 ids 头部
     * - 页码计算：prevPage = Math.floor(baseIndex / PAGE_SIZE)
     * - 并发安全：用 requestId 防止过期响应写入
     * - 去重 & 过滤：同 loadMore
     * - 成功加载后 baseIndex 向前回退 PAGE_SIZE
     * - 若无前一页数据（baseIndex === 0 且后端无更多前向数据），设 canLoadPrev = false
     */
    _loadPrevious: async () => {
        const { activeKey, queries } = get()
        if (!activeKey) return

        const q = queries[activeKey]
        if (!q || q.loadingPrev || !q.canLoadPrev) return

        const myRequestId = q.requestId + 1
        set(state => {
            state.queries[activeKey]!.loadingPrev = true
            state.queries[activeKey]!.error = null
            state.queries[activeKey]!.requestId = myRequestId
        })

        try {
            const adapter = getAdapter(q.provider)
            // 计算前一页的页码（baseIndex 所在的页）
            const prevPageNum = Math.floor(q.baseIndex / PAGE_SIZE)
            if (prevPageNum < 1) {
                // 已在第1页，无法向前加载
                set(state => {
                    state.queries[activeKey]!.loadingPrev = false
                    state.queries[activeKey]!.canLoadPrev = false
                })
                return
            }

            console.log('[recordStore] fetching previous page for query:', activeKey, 'page:', prevPageNum, 'baseIndex:', q.baseIndex)
            const { data, hasMore } = await adapter.fetch(q.api, q.params, prevPageNum)
            console.log('[recordStore] fetch previous result:', { count: data.length, hasMore, activeKey })

            set(state => {
                const current = state.queries[activeKey]!
                // 请求已被更新的请求覆盖，丢弃此响应
                if (current.requestId !== myRequestId) {
                    console.log('[recordStore] stale request for loadPrevious, discarding:', activeKey)
                    return
                }

                try {
                    // 合并实体
                    data.forEach(item => {
                        state.entities[item.id] = item
                    })

                    const existingIds = new Set(current.ids)
                    const itemsToAdd = data
                        .filter(item => !current.deletedIds.has(item.id) && !existingIds.has(item.id))

                    // 插入到头部（前向加载）
                    itemsToAdd.reverse().forEach(item => {
                        current.ids.unshift(item.id)
                    })

                    // 更新 baseIndex（向前回退）
                    current.baseIndex = prevPageNum * PAGE_SIZE - itemsToAdd.length
                    if (current.baseIndex < 0) {
                        current.baseIndex = 0
                    }

                    // 判断是否还能继续向前加载
                    current.canLoadPrev = current.baseIndex > 0

                    current.loadedAt = Date.now()
                    current.loadingPrev = false

                    console.log('[recordStore] loaded previous page:', { newBaseIndex: current.baseIndex, itemsAdded: itemsToAdd.length, canLoadPrev: current.canLoadPrev })
                } catch (err) {
                    console.error('[recordStore] error during previous merge:', err)
                    throw err
                }
            })
        } catch (err) {
            set(state => {
                if (state.queries[activeKey]!.requestId === myRequestId) {
                    state.queries[activeKey]!.loadingPrev = false
                    state.queries[activeKey]!.error = (err as Error).message
                }
            })
        }
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

    enableAutoPlay: (intervalSec: number) => {
        const normalized = Math.max(1, Math.round(intervalSec))
        set(state => {
            state.autoPlay = normalized
        })
        get()._resetAutoPlayTimer()
    },

    disableAutoPlay: () => {
        get()._clearAutoPlayTimer()
        set(state => {
            state.autoPlay = 'stop'
            state.autoPlayInFlight = false
        })
    },

    /**
     * 导航到指定的全局序号
     * index 是全局序号（从0开始），例如 navigate(23) 将跳转到第23项
     * 若目标超出已加载范围，会自动补充加载
     * 成功导航后自动记录当前 record 到历史（在非历史浏览模式下）
     */
    navigate: async (delta: number) => {
        if (!Number.isInteger(delta)) return

        // 历史模式下：移动历史游标（环形），不退出历史模式
        if (get().isHistoryMode()) {
            const h = get().history
            if (h.length === 0) return
            set(state => {
                const len = h.length
                const idx = ((state.historyCursor + delta) % len + len) % len
                state.historyCursor = idx
            })
            return
        }

        const q0 = get().currentQuery()
        if (!q0) return

        // 当前全局索引
        const currentGlobal = get()._getCurrentGlobalIndex()
        const targetGlobal = currentGlobal + delta
        if (targetGlobal < 0) return

        // 确保加载目标
        await get()._ensureLoaded(targetGlobal)
        const q = get().currentQuery()
        if (!q) return

        const localCursor = targetGlobal - q.baseIndex
        const visibleItems = q.ids
            .filter(id => !q.deletedIds.has(id))
            .map(id => get().entities[id])
            .filter((item): item is ProviderRecord => Boolean(item))

        if (localCursor < 0 || localCursor >= visibleItems.length) {
            console.log('[recordStore] navigate target out of range after loading:', { targetGlobal, baseIndex: q.baseIndex, visibleCount: visibleItems.length })
            return
        }

        set(state => { state.cursor = localCursor })

        // 导航成功后，记录当前 record 到历史（仅在非历史浏览模式）
        const record = get().currentRecord()
        if (record) {
            const history = get().history
            if (history.length === 0 || history.at(-1)!.id !== record.id) {
                set(state => { state.history.push(record) })
            }
        }

        // 接近末尾时自动后台预加载下一页
        if (q.hasMore && visibleItems.length - localCursor <= PREFETCH_THRESHOLD) {
            void get().loadMore()  // 不 await，静默后台加载
        }

        if (get().autoPlayTimerId !== null) {
            get()._resetAutoPlayTimer()
        }

        const nextRecord = await get().peek(1)
        set(state => {
            state.pendingPreloadUrl = nextRecord?.type === 'image' ? nextRecord.url : null
        })
    },

    /**
     * 便捷方法：导航到下一项（相当于 navigate(currentIndex + 1)）
     */
    next: async () => {
        await get().navigate(1)
    },

    /**
     * 便捷方法：导航到上一项（相当于 navigate(currentIndex - 1)）
     */
    _prev: async () => {
        const q = get().currentQuery()
        if (!q) return
        const currentIndex = get()._getCurrentGlobalIndex()
        await get().navigate(currentIndex - 1)
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
     * 跳到第一个
     */
    goToFirst: async () => {
        await get().navigate(0)
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
    // goToIndex 已移除；请使用历史相关 API 或 navigate(index)/next()/prev()

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
        set(state => { state.historyCursor = -1 })
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
     * 确保本地已加载到足够覆盖目标全局下标的数据
     * 采用双向加载：若目标在已加载范围外，向指定方向加载
     */
    _ensureLoaded: async (globalIdx: number) => {
        const q = get().currentQuery()
        if (!q) return

        const maxLoadedIdx = q.baseIndex + q.ids.length - 1

        // 若目标已在已加载范围内，直接返回
        if (globalIdx >= q.baseIndex && globalIdx <= maxLoadedIdx) {
            return
        }

        // 若目标在范围前方，向前加载
        if (globalIdx < q.baseIndex) {
            while (globalIdx < q.baseIndex && q.canLoadPrev) {
                await get()._loadPrevious()
            }
        }
        // 若目标在范围后方，向后加载
        else if (globalIdx > maxLoadedIdx) {
            while (globalIdx > get().currentQuery()!.baseIndex + get().currentQuery()!.ids.length - 1 && get().currentQuery()!.hasMore) {
                await get().loadMore()
            }
        }
    },

    /**
     * 获取当前光标指向的全局序号
     * 若没有激活查询或光标无效，返回 0
     */
    _getCurrentGlobalIndex: () => {
        const q = get().currentQuery()
        if (!q) return 0
        return q.baseIndex + get().cursor
    },

    _clearAutoPlayTimer: () => {
        if (typeof window === 'undefined') {
            set(state => {
                state.autoPlayTimerId = null
            })
            return
        }

        const timerId = get().autoPlayTimerId
        if (timerId !== null) {
            window.clearInterval(timerId)
        }

        set(state => {
            state.autoPlayTimerId = null
        })
    },

    _resetAutoPlayTimer: () => {
        if (typeof window === 'undefined') return

        const autoPlay = get().autoPlay
        if (autoPlay === 'stop') {
            get()._clearAutoPlayTimer()
            return
        }

        const intervalMs = Math.max(1, Math.round(autoPlay * 1000))
        get()._clearAutoPlayTimer()

        const timerId = window.setInterval(() => {
            const state = get()
            if (state.autoPlay === 'stop' || state.autoPlayInFlight) {
                return
            }

            const q = state.currentQuery()
            if (!q) {
                state.disableAutoPlay()
                return
            }

            const visibleCount = q.ids.filter((id) => !q.deletedIds.has(id)).length
            const currentIndex = state._getCurrentGlobalIndex()
            const maxLoadedIndex = q.baseIndex + visibleCount - 1
            if (!q.hasMore && currentIndex >= maxLoadedIndex) {
                state.disableAutoPlay()
                return
            }

            set(s => {
                s.autoPlayInFlight = true
            })
            void state.navigate(1).finally(() => {
                set(s => {
                    s.autoPlayInFlight = false
                })
            })
        }, intervalMs)

        set(state => {
            state.autoPlayTimerId = timerId
        })
    },
})))