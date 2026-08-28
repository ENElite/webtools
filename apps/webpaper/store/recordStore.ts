import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { enableMapSet } from 'immer'
import type { RecordState } from './type';
import { createEntitySlice } from './entityStore';
import { createQueryCacheSlice } from './queryCache';
import { createNavigationSlice } from './navigationStore';
import { createAutoPlaySlice } from './autoPlayStore';

enableMapSet()

export const useRecordStore = create<RecordState>()(immer((set, get) => {
    const api = { get, set: set as (fn: (state: RecordState) => void) => void };

    return {
        // 初始状态
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

        // 合并所有 slice
        ...createEntitySlice(api),
        ...createQueryCacheSlice(api),
        ...createNavigationSlice(api),
        ...createAutoPlaySlice(api),
    };
}))
