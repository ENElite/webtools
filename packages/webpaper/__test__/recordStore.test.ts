import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useRecordStore } from '../store/recordStore'

const PAGE_SIZE = 10

// Mock getAdapter from providers to control fetch behavior
const makeAdapter = () => {
    const calls: Array<{ api: string; params: any; page: number }> = []

    const adapter = {
        provider: 'Json' as const,
        fetch: async (api: string, params: any, page: number) => {
            calls.push({ api, params, page })
            // generate PAGE_SIZE items per page for predictable behavior (matching PAGE_SIZE = 10)
            const base = (page - 1) * PAGE_SIZE
            const data = Array.from({ length: PAGE_SIZE }).map((_, i) => ({
                id: `p${page}-${i}`,
                type: 'image' as const,
                provider: 'Json' as const,
                url: `https://example.com/${base + i}.jpg`,
            }))
            return { data, hasMore: page < 3 }
        },
        normalize: (raw: any) => raw,
        hasMore: () => true,
        serializeParams: JSON.stringify,
    }

    return { adapter, calls }
}

// Each test will spyOn providers.getAdapter as needed.

async function mockGetAdapter(adapter: any) {
    const providers = (await vi.importActual('../providers')) as any
    vi.spyOn(providers, 'getAdapter').mockImplementation(() => adapter as any)
}

describe('recordStore', () => {
    beforeEach(() => {
        useRecordStore.getState().disableAutoPlay?.()
        // reset store to initial state
        useRecordStore.setState({
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
        })
        vi.clearAllMocks()
    })

    it('loadMore appends entities and ids, avoids duplicates and updates baseIndex', async () => {
        const { adapter, calls } = makeAdapter()
        await mockGetAdapter(adapter)

        const store = useRecordStore.getState()
        await store.switchQuery('Json' as any, 'api', {})

        await waitFor(() => {
            const q = useRecordStore.getState().currentQuery()
            return Boolean(q && q.loadedAt !== null)
        })

        const q = useRecordStore.getState().currentQuery()!
        // makeAdapter returns PAGE_SIZE (10) items per page
        expect(q.ids.length).toBeGreaterThanOrEqual(10)
        expect(Object.keys(useRecordStore.getState().entities).length).toBeGreaterThanOrEqual(10)
        expect(q.baseIndex).toBe(0)

        // call loadMore explicitly to append page 2
        await useRecordStore.getState().loadMore()
        const q2 = useRecordStore.getState().currentQuery()!
        expect(q2.ids.length).toBeGreaterThanOrEqual(20)
        expect(q2.baseIndex).toBe(0)
        expect(calls.length).toBeGreaterThanOrEqual(2)
    })

    it('switchQuery starts from baseIndex 0', async () => {
        const { adapter, calls } = makeAdapter()
        await mockGetAdapter(adapter)

        await useRecordStore.getState().switchQuery('Json' as any, 'api', {})
        await waitFor(() => useRecordStore.getState().currentQuery()?.loadedAt != null)

        const q = useRecordStore.getState().currentQuery()!
        expect(q.baseIndex).toBe(0)
        // first page requested should be page 1 (since baseIndex 0 = page 1)
        expect(calls[0]?.page).toBe(1)
    })

    it('switchQuery with page param requests that page first', async () => {
        const { adapter, calls } = makeAdapter()
        await mockGetAdapter(adapter)

        await useRecordStore.getState().switchQuery('Json' as any, 'api', { page: 3 })
        await waitFor(() => useRecordStore.getState().currentQuery()?.loadedAt != null)

        const q = useRecordStore.getState().currentQuery()!
        expect(q.baseIndex).toBe(20)
        expect(calls[0]?.page).toBe(3)
    })

    it('switchQuery clears history browsing so the current query can render', async () => {
        const { adapter } = makeAdapter()
        await mockGetAdapter(adapter)

        await useRecordStore.getState().switchQuery('Json' as any, 'api', {})
        await waitFor(() => useRecordStore.getState().currentQuery()?.loadedAt != null)

        useRecordStore.setState({
            history: [{
                id: 'history-item',
                provider: 'Json',
                type: 'image',
                url: 'https://example.com/history.jpg',
            } as any],
            historyCursor: 0,
        })
        expect(useRecordStore.getState().historyCursor).toBe(0)

        await useRecordStore.getState().switchQuery('Json' as any, 'api', {})
        expect(useRecordStore.getState().historyCursor).toBe(-1)
    })

    it('switchQuery keeps exposing previous stable record while target page is loading', async () => {
        let resolvePage2: ((value: { data: ProviderRecord[]; hasMore: boolean }) => void) | null = null
        const calls: Array<{ page: number }> = []
        const adapter = {
            provider: 'Json' as const,
            fetch: async (_api: string, _params: any, page: number) => {
                calls.push({ page })
                if (page === 2) {
                    return await new Promise<{ data: ProviderRecord[]; hasMore: boolean }>((resolve) => {
                        resolvePage2 = resolve
                    })
                }

                const data = Array.from({ length: PAGE_SIZE }).map((_, i) => ({
                    id: `p${page}-${i}`,
                    type: 'image' as const,
                    provider: 'Json' as const,
                    url: `https://example.com/${page}-${i}.jpg`,
                }))
                return { data, hasMore: true }
            },
            normalize: (raw: any) => raw,
            hasMore: () => true,
            serializeParams: JSON.stringify,
        }

        await mockGetAdapter(adapter)

        await useRecordStore.getState().switchQuery('Json' as any, 'api', { page: 1 })
        await waitFor(() => useRecordStore.getState().currentQuery()?.loadedAt != null)
        const stableBefore = useRecordStore.getState().currentRecord()?.id
        expect(stableBefore).toBe('p1-0')

        useRecordStore.getState().switchQuery('Json' as any, 'api', { page: 2 })

        // During target page loading, currentRecord should remain previous stable record.
        expect(useRecordStore.getState().currentRecord()?.id).toBe('p1-0')
        expect(resolvePage2).toBeTruthy()
        expect(calls.some((call) => call.page === 2)).toBe(true)

        resolvePage2!({
            data: Array.from({ length: PAGE_SIZE }).map((_, i) => ({
                id: `p2-${i}`,
                type: 'image' as const,
                provider: 'Json' as const,
                url: `https://example.com/2-${i}.jpg`,
            })),
            hasMore: false,
        })

        await waitFor(() => {
            const q = useRecordStore.getState().currentQuery()
            return Boolean(q && q.baseIndex === 10 && q.loadedAt)
        })
        expect(useRecordStore.getState().currentRecord()?.id).toBe('p2-0')
    })

    it('next() moves to next item (relative navigation)', async () => {
        const { adapter, calls } = makeAdapter()
        await mockGetAdapter(adapter)

        await useRecordStore.getState().switchQuery('Json' as any, 'api', {})
        await waitFor(() => useRecordStore.getState().currentQuery()?.loadedAt != null)

        const beforeCalls = calls.length
        expect(useRecordStore.getState().cursor).toBe(0)

        // navigate to next (should be global index 1, local cursor 1)
        await useRecordStore.getState().next()
        expect(useRecordStore.getState().cursor).toBe(1)
        expect(calls.length).toBe(beforeCalls) // no additional prefetch
    })

    it('navigate(delta) moves relatively in normal mode', async () => {
        const { adapter, calls } = makeAdapter()
        await mockGetAdapter(adapter)

        await useRecordStore.getState().switchQuery('Json' as any, 'api', {})
        await waitFor(() => useRecordStore.getState().currentQuery()?.loadedAt != null)

        // navigate forward by 3 items
        await useRecordStore.getState().navigate(3)
        expect(useRecordStore.getState().cursor).toBe(3)
    })

    it('navigate(delta) cross-page loads more data when needed', async () => {
        const { adapter, calls } = makeAdapter()
        await mockGetAdapter(adapter)

        await useRecordStore.getState().switchQuery('Json' as any, 'api', {})
        await waitFor(() => useRecordStore.getState().currentQuery()?.loadedAt != null)

        // initial state: baseIndex 0, 10 items loaded (ids 0-9)
        // navigate forward by 15 items (needs page 2)
        await useRecordStore.getState().navigate(15)

        const q = useRecordStore.getState().currentQuery()!
        // should have loaded at least 2 pages (20 items)
        expect(q.ids.length).toBeGreaterThanOrEqual(16)
        expect(useRecordStore.getState().cursor).toBeLessThanOrEqual(16)
    })

    it('next() triggers prefetch when near end', async () => {
        // create adapter that returns 3 items per page to provoke prefetch
        const calls: Array<any> = []
        const adapter = {
            provider: 'Json' as const,
            fetch: async (api: string, params: any, page: number) => {
                calls.push({ api, page })
                const data = Array.from({ length: 3 }).map((_, i) => ({
                    id: `s${page}-${i}`,
                    type: 'image' as const,
                    provider: 'Json' as const,
                    url: `https://example.com/s${page}-${i}.jpg`,
                }))
                return { data, hasMore: page < 3 }
            },
            normalize: (raw: any) => raw,
            hasMore: () => true,
            serializeParams: JSON.stringify,
        }

        await mockGetAdapter(adapter)

        await useRecordStore.getState().switchQuery('Json' as any, 'api', {})
        await waitFor(() => useRecordStore.getState().currentQuery()?.loadedAt != null)

        const q = useRecordStore.getState().currentQuery()!
        expect(q.ids.length).toBe(3)
        const before = calls.length

        // navigate to index 1 (cursor becomes 1, distance to end is 3 - 1 = 2 which equals PREFETCH_THRESHOLD)
        await useRecordStore.getState().navigate(1)

        // allow prefetch to run
        await waitFor(() => calls.length > before, 1000)
        expect(calls.length).toBeGreaterThan(before)
    })

    it('removeRecord marks deleted and fixes cursor', async () => {
        const { adapter } = makeAdapter()
        await mockGetAdapter(adapter)

        await useRecordStore.getState().switchQuery('Json' as any, 'api', {})
        await waitFor(() => useRecordStore.getState().currentQuery()?.loadedAt != null)

        useRecordStore.getState().removeRecord(0)
        const q = useRecordStore.getState().currentQuery()!
        expect(q.deletedIds.size).toBe(1)
        expect(useRecordStore.getState().cursor).toBeGreaterThanOrEqual(0)
    })

    it('_getCurrentGlobalIndex returns correct global index', async () => {
        const { adapter } = makeAdapter()
        await mockGetAdapter(adapter)

        await useRecordStore.getState().switchQuery('Json' as any, 'api', {})
        await waitFor(() => useRecordStore.getState().currentQuery()?.loadedAt != null)

        // Initially baseIndex = 0, cursor = 0, so global index = 0
        expect(useRecordStore.getState()._getCurrentGlobalIndex()).toBe(0)

        // After navigate(3), global index should be 3
        await useRecordStore.getState().navigate(3)
        expect(useRecordStore.getState()._getCurrentGlobalIndex()).toBe(3)
    })

    it('navigate updates pendingPreloadUrl with next image url', async () => {
        const { adapter } = makeAdapter()
        await mockGetAdapter(adapter)

        await useRecordStore.getState().switchQuery('Json' as any, 'api', {})
        await waitFor(() => useRecordStore.getState().currentQuery()?.loadedAt != null)

        expect(useRecordStore.getState().pendingPreloadUrl).toBeNull()
        await useRecordStore.getState().navigate(0)

        expect(useRecordStore.getState().pendingPreloadUrl).toBe('https://example.com/1.jpg')
    })

    it('enableAutoPlay schedules periodic navigation and resets after navigate', async () => {
        const { adapter } = makeAdapter()
        await mockGetAdapter(adapter)

        await useRecordStore.getState().switchQuery('Json' as any, 'api', {})
        await waitFor(() => useRecordStore.getState().currentQuery()?.loadedAt != null)

        vi.useFakeTimers()
        try {
            useRecordStore.getState().enableAutoPlay(1)
            await vi.advanceTimersByTimeAsync(1000)
            expect(useRecordStore.getState().cursor).toBe(1)

            await useRecordStore.getState().navigate(2)
            await vi.advanceTimersByTimeAsync(999)
            expect(useRecordStore.getState().cursor).toBe(3)

            await vi.advanceTimersByTimeAsync(1)
            expect(useRecordStore.getState().cursor).toBe(4)
        } finally {
            useRecordStore.getState().disableAutoPlay()
            vi.useRealTimers()
        }
    })

    it('history mode is circular and leaves back to query mode', async () => {
        const { adapter } = makeAdapter()
        await mockGetAdapter(adapter)

        await useRecordStore.getState().switchQuery('Json' as any, 'api', {})
        await waitFor(() => useRecordStore.getState().currentQuery()?.loadedAt != null)

        await useRecordStore.getState().navigate(1)
        await useRecordStore.getState().navigate(1)

        const history = useRecordStore.getState().getHistory()
        expect(history.length).toBeGreaterThanOrEqual(3)

        useRecordStore.getState().enterHistoryMode()
        expect(useRecordStore.getState().isHistoryMode()).toBe(true)
        expect(useRecordStore.getState().currentRecord()?.id).toBe(history.at(-1)?.id)

        await useRecordStore.getState().navigate(-1)
        expect(useRecordStore.getState().currentRecord()?.id).toBe(history.at(history.length - 2)?.id)

        await useRecordStore.getState().navigate(-1)
        expect(useRecordStore.getState().currentRecord()?.id).toBe(history[history.length - 3]?.id)

        await useRecordStore.getState().navigate(1)
        expect(useRecordStore.getState().currentRecord()?.id).toBe(history.at(-2)?.id)

        useRecordStore.getState().leaveHistoryMode()
        expect(useRecordStore.getState().isHistoryMode()).toBe(false)
        expect(useRecordStore.getState().currentRecord()?.id).toBeDefined()
    })
})

// helper: poll until condition or timeout
async function waitFor(fn: () => boolean, timeout = 2000) {
    const start = Date.now()
    while (Date.now() - start < timeout) {
        if (fn()) return
        await new Promise(r => setTimeout(r, 10))
    }
    throw new Error('waitFor timeout')
}
