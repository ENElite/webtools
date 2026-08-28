import type { ProviderRecord } from '@/providers'
import type { RecordState } from './type';
import { PREFETCH_THRESHOLD } from './type';

type StoreApi = {
    get: () => RecordState;
    set: (fn: (state: RecordState) => void) => void;
};

export function createNavigationSlice({ get, set }: StoreApi) {
    return {
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

        // ─── 历史浏览 API ───────────────────────────────────────────────────────
        goToHistory: (pos: number) => {
            const h = get().history
            if (h.length === 0) return
            const idx = Math.max(0, Math.min(pos, h.length - 1))
            set(state => { state.historyCursor = idx })
        },

        returnToCurrent: () => {
            set(state => { state.historyCursor = -1 })
        },

        // ─── 导航 ──────────────────────────────────────────────────────────────────

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
         * 便捷方法：导航到下一项
         */
        next: async () => {
            await get().navigate(1)
        },

        /**
         * 便捷方法：导航到上一项
         */
        _prev: async () => {
            const q = get().currentQuery()
            if (!q) return
            const currentIndex = get()._getCurrentGlobalIndex()
            await get().navigate(currentIndex - 1)
        },

        /**
         * 预览相对位置的实体但不移动光标
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

        // ─── 内部工具 ──────────────────────────────────────────────────────────────

        /**
         * 删除操作后修正 cursor，保证光标指向有效位置
         */
        _fixCursor: (deletedLocalIdx: number) => {
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
    };
}
