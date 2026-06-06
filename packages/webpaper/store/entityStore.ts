import type { ProviderRecord } from '@/providers'
import type { RecordState } from './type';

type StoreApi = {
    get: () => RecordState;
    set: (fn: (state: RecordState) => void) => void;
};

export function createEntitySlice({ get, set }: StoreApi) {
    return {
        /**
         * 从当前查询的视图中移除一个条目（纯前端软删除）
         * broadcast = true 时同步到所有其他查询的 deletedIds（适用于"彻底不想看到"语义）
         * broadcast = false（默认）时只影响当前查询（适用于"从这个结果里移除"语义）
         * cursor 根据被删位置自动修正
         */
        removeRecord: (localIdx: number, broadcast = false) => {
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
        updateRecord: (id: string, patch: Partial<ProviderRecord>) => {
            set(state => {
                if (state.entities[id]) {
                    Object.assign(state.entities[id], patch)
                }
            })
        },

        /**
         * 根据 id 获取实体，找不到时返回 null
         */
        getRecord: (id: string) => {
            return get().entities[id] ?? null
        },
    };
}
