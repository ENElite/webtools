import type { RecordState } from './type';

type StoreApi = {
    get: () => RecordState;
    set: (fn: (state: RecordState) => void) => void;
};

export function createAutoPlaySlice({ get, set }: StoreApi) {
    return {
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
    };
}
