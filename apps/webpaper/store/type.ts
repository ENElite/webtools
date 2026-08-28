import type { ProviderRecord } from '@/providers'
import { Provider } from '@/providers/types';

export interface QueryState {
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

export interface RecordState {
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
    _loadPrevious: () => Promise<void>

    // 导航
    navigate: (delta: number) => Promise<void>
    next: () => Promise<void>
    _prev: () => Promise<void>
    enableAutoPlay: (intervalSec: number) => void
    disableAutoPlay: () => void
    peek: (delta?: number) => Promise<ProviderRecord | null>
    goToFirst: () => void

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

export const CACHE_TTL = 5 * 60 * 1000
export const PAGE_SIZE = 10
export const PREFETCH_THRESHOLD = 2
