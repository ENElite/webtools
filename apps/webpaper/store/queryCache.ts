import { getAdapter } from '@/providers'
import type { ProviderRecord } from '@/providers'
import { Provider } from '@/providers/types';
import type { RecordState } from './type';
import { CACHE_TTL, PAGE_SIZE } from './type';

type StoreApi = {
    get: () => RecordState;
    set: (fn: (state: RecordState) => void) => void;
};

export function createQueryCacheSlice({ get, set }: StoreApi) {
    return {
        /**
         * 将 api 名和参数对象序列化为稳定的查询 key
         * 参数 key 按字母排序，保证 {a:1,b:2} 和 {b:2,a:1} 命中同一个缓存
         */
        _buildKey: (provider: Provider, api: string, params: Record<string, unknown>) => {
            const adapter = getAdapter(provider)
            const paramStr = adapter.serializeParams
                ? adapter.serializeParams(params)
                : JSON.stringify(Object.fromEntries(Object.keys(params).sort().map(k => [k, params[k]])))
            return `${provider}/${api}?${paramStr}`
        },

        /**
         * 切换当前激活的查询
         * - 已有缓存且未过期：直接激活，不重新请求
         * - 已有缓存但已过期：保留 deletedIds，重置数据状态，重新加载第一页
         * - 全新查询：初始化 QueryState，立即加载第一页
         * cursor 始终归零，baseIndex 从 0 开始（对应第1页）
         */
        switchQuery: (provider: Provider, api: string, params: Record<string, unknown>) => {
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
        invalidateQuery: (key: string) => {
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

        /**
         * 检查当前查询是否还有更多数据可加载（向后）
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
         */
        hasPrev: () => {
            const { activeKey, queries } = get()
            if (!activeKey) return false

            const q = queries[activeKey]
            if (!q || q.loadingPrev || !q.canLoadPrev) return false

            return q.canLoadPrev;
        },

        /**
         * 加载当前查询的下一页数据，追加到 ids 末尾
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
                const nextPageNum = Math.floor((q.baseIndex + q.ids.length) / PAGE_SIZE) + 1
                console.log('[recordStore] fetching data for query:', activeKey, 'page:', nextPageNum, 'baseIndex:', q.baseIndex, 'idsLen:', q.ids.length)
                const { data, hasMore } = await adapter.fetch(q.api, q.params, nextPageNum)
                console.log('[recordStore] fetch result:', { count: data.length, hasMore, activeKey })

                set(state => {
                    const current = state.queries[activeKey]!
                    const beforeCount = current.ids.length
                    if (current.requestId !== myRequestId) {
                        console.log('[recordStore] stale request, discarding:', activeKey)
                        return
                    }

                    try {
                        console.log('[recordStore] before merge:', { beforeCount, currentIdsType: typeof current.ids, isArray: Array.isArray(current.ids) })

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
         * 加载当前查询的前一页数据，插入到 ids 头部
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
                const prevPageNum = Math.floor(q.baseIndex / PAGE_SIZE)
                if (prevPageNum < 1) {
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
                    if (current.requestId !== myRequestId) {
                        console.log('[recordStore] stale request for loadPrevious, discarding:', activeKey)
                        return
                    }

                    try {
                        data.forEach(item => {
                            state.entities[item.id] = item
                        })

                        const existingIds = new Set(current.ids)
                        const itemsToAdd = data
                            .filter(item => !current.deletedIds.has(item.id) && !existingIds.has(item.id))

                        itemsToAdd.reverse().forEach(item => {
                            current.ids.unshift(item.id)
                        })

                        current.baseIndex = prevPageNum * PAGE_SIZE - itemsToAdd.length
                        if (current.baseIndex < 0) {
                            current.baseIndex = 0
                        }

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
         * 确保本地已加载到足够覆盖目标全局下标的数据
         */
        _ensureLoaded: async (globalIdx: number) => {
            const q = get().currentQuery()
            if (!q) return

            const maxLoadedIdx = q.baseIndex + q.ids.length - 1

            if (globalIdx >= q.baseIndex && globalIdx <= maxLoadedIdx) {
                return
            }

            if (globalIdx < q.baseIndex) {
                while (globalIdx < q.baseIndex && q.canLoadPrev) {
                    await get()._loadPrevious()
                }
            }
            else if (globalIdx > maxLoadedIdx) {
                while (globalIdx > get().currentQuery()!.baseIndex + get().currentQuery()!.ids.length - 1 && get().currentQuery()!.hasMore) {
                    await get().loadMore()
                }
            }
        },

        /**
         * 获取当前光标指向的全局序号
         */
        _getCurrentGlobalIndex: () => {
            const q = get().currentQuery()
            if (!q) return 0
            return q.baseIndex + get().cursor
        },
    };
}
