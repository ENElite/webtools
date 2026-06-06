import React, { useEffect } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createFetch, useFetch } from '@/hooks/useFetch';
import type { UseFetchReturn } from '@/hooks/useFetch';

type HookFactory = () => UseFetchReturn<any>;

function Harness({
    useHook,
    onSnapshot,
}: {
    useHook: HookFactory;
    onSnapshot: (snapshot: UseFetchReturn<any>) => void;
}) {
    const snapshot = useHook();

    useEffect(() => {
        onSnapshot(snapshot);
    }, [snapshot, onSnapshot]);

    return null;
}

function renderHarness(useHook: HookFactory, onSnapshot: (snapshot: UseFetchReturn<any>) => void): Root {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
        root.render(<Harness useHook={useHook} onSnapshot={onSnapshot} />);
    });

    return root;
}

describe('useFetch', () => {
    let originalActEnvironment: boolean | undefined;

    beforeEach(() => {
        originalActEnvironment = (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    });

    afterEach(() => {
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
        document.body.innerHTML = '';
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('execute performs fetch and parses json via json() chain', async () => {
        const mockResponse = new Response(JSON.stringify({ hello: 'world' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

        const fetchMock = vi.fn().mockResolvedValue(mockResponse);
        (globalThis as any).fetch = fetchMock;

        const snapshots: UseFetchReturn<any>[] = [];
        const root = renderHarness(
            () => useFetch('/api/test', {}, { immediate: false, refetch: false }),
            (snapshot) => snapshots.push(snapshot),
        );

        await act(async () => {
            await Promise.resolve();
        });

        const first = snapshots[0];
        await act(async () => {
            await first.json<{ hello: string }>().execute();
            await Promise.resolve();
        });

        expect(fetchMock).toHaveBeenCalled();
        expect(snapshots.at(-1)?.data).toEqual({ hello: 'world' });

        act(() => {
            root.unmount();
        });
    });

    it('retries failed fetches according to retry option', async () => {
        const mockResponse = new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

        const fetchMock = vi.fn()
            .mockRejectedValueOnce(new Error('network'))
            .mockResolvedValueOnce(mockResponse);
        (globalThis as any).fetch = fetchMock;

        const snapshots: UseFetchReturn<any>[] = [];
        const root = renderHarness(
            () => useFetch('/api/test', {}, { immediate: false, refetch: false, retry: 1 }),
            (snapshot) => snapshots.push(snapshot),
        );

        await act(async () => {
            await Promise.resolve();
        });

        const first = snapshots[0];
        await act(async () => {
            await first.json().execute();
            await Promise.resolve();
        });

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(snapshots.at(-1)?.data).toEqual({ ok: true });

        act(() => {
            root.unmount();
        });
    });

    it('uses exponential backoff when retryDelay is auto', async () => {
        vi.useFakeTimers();

        const timerSpy = vi.spyOn(globalThis, 'setTimeout');
        const mockResponse = new Response(JSON.stringify({ ok: 1 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

        const fetchMock = vi.fn()
            .mockRejectedValueOnce(new Error('e1'))
            .mockRejectedValueOnce(new Error('e2'))
            .mockResolvedValueOnce(mockResponse);
        (globalThis as any).fetch = fetchMock;

        const snapshots: UseFetchReturn<any>[] = [];
        const root = renderHarness(
            () => useFetch('/api/auto', {}, { immediate: false, refetch: false, retry: 2, retryDelay: 'auto' }),
            (snapshot) => snapshots.push(snapshot),
        );

        await act(async () => {
            await Promise.resolve();
        });

        const first = snapshots[0];
        await act(async () => {
            const pending = first.json().execute();
            await Promise.resolve();
            await vi.advanceTimersByTimeAsync(100);
            await vi.advanceTimersByTimeAsync(200);
            await pending;
            await Promise.resolve();
        });

        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(timerSpy).toHaveBeenCalledWith(expect.any(Function), 100);
        expect(timerSpy).toHaveBeenCalledWith(expect.any(Function), 200);
        expect(snapshots.at(-1)?.data).toEqual({ ok: 1 });

        act(() => {
            root.unmount();
        });
    });

    it('supports retry as inf and eventually succeeds', async () => {
        const mockResponse = new Response(JSON.stringify({ ok: 'inf' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

        const fetchMock = vi.fn()
            .mockRejectedValueOnce(new Error('1'))
            .mockRejectedValueOnce(new Error('2'))
            .mockRejectedValueOnce(new Error('3'))
            .mockResolvedValueOnce(mockResponse);
        (globalThis as any).fetch = fetchMock;

        const snapshots: UseFetchReturn<any>[] = [];
        const root = renderHarness(
            () => useFetch('/api/inf', {}, { immediate: false, refetch: false, retry: 'inf' }),
            (snapshot) => snapshots.push(snapshot),
        );

        await act(async () => {
            await Promise.resolve();
        });

        await act(async () => {
            await snapshots[0].json().execute();
            await Promise.resolve();
        });

        expect(fetchMock).toHaveBeenCalledTimes(4);
        expect(snapshots.at(-1)?.data).toEqual({ ok: 'inf' });

        act(() => {
            root.unmount();
        });
    });

    it('marks aborted and runs finally when request is aborted', async () => {
        const onFinally = vi.fn();
        const fetchMock = vi.fn((_: string, init?: RequestInit) => {
            const signal = init?.signal as AbortSignal;
            return new Promise<Response>((_, reject) => {
                if (signal.aborted) {
                    reject(new DOMException('Aborted', 'AbortError'));
                    return;
                }
                signal.addEventListener(
                    'abort',
                    () => {
                        reject(new DOMException('Aborted', 'AbortError'));
                    },
                    { once: true },
                );
            });
        });
        (globalThis as any).fetch = fetchMock;

        const snapshots: UseFetchReturn<any>[] = [];
        const root = renderHarness(
            () => useFetch('/api/abort', {}, { immediate: false, refetch: false, onFinally }),
            (snapshot) => snapshots.push(snapshot),
        );

        await act(async () => {
            await Promise.resolve();
        });

        const first = snapshots[0];
        await act(async () => {
            const pending = first.execute();
            await Promise.resolve();
            first.abort();
            await pending;
            await Promise.resolve();
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(onFinally).toHaveBeenCalledTimes(1);
        expect(snapshots.at(-1)?.aborted).toBe(true);

        act(() => {
            root.unmount();
        });
    });

    it('sets error when json parser fails', async () => {
        const badJsonResponse = new Response('not-json', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
        const fetchMock = vi.fn().mockResolvedValue(badJsonResponse);
        (globalThis as any).fetch = fetchMock;

        const snapshots: UseFetchReturn<any>[] = [];
        const root = renderHarness(
            () => useFetch('/api/bad-json', {}, { immediate: false, refetch: false }),
            (snapshot) => snapshots.push(snapshot),
        );

        await act(async () => {
            await Promise.resolve();
        });

        await act(async () => {
            await snapshots[0].json().execute();
            await Promise.resolve();
        });

        expect(snapshots.at(-1)?.error).toBeInstanceOf(Error);

        act(() => {
            root.unmount();
        });
    });

    it('updateUrl supports execute false and true branches', async () => {
        const firstResponse = new Response(JSON.stringify({ id: 1 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
        const secondResponse = new Response(JSON.stringify({ id: 2 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

        const fetchMock = vi.fn()
            .mockResolvedValueOnce(firstResponse)
            .mockResolvedValueOnce(secondResponse);
        (globalThis as any).fetch = fetchMock;

        const snapshots: UseFetchReturn<any>[] = [];
        const root = renderHarness(
            () => useFetch('/api/one', {}, { immediate: false, refetch: false }),
            (snapshot) => snapshots.push(snapshot),
        );

        await act(async () => {
            await Promise.resolve();
        });

        let savedResponse: Response | null = null;

        await act(async () => {
            savedResponse = await snapshots[0].execute();
            await Promise.resolve();
        });

        const latest = snapshots.at(-1)!;

        await act(async () => {
            const returned = await latest.updateUrl('/api/two', false);
            expect(returned).toBe(savedResponse);
            await Promise.resolve();
        });

        await act(async () => {
            await latest.updateUrl('/api/two', true);
            await Promise.resolve();
        });

        expect(fetchMock).toHaveBeenCalledTimes(2);

        act(() => {
            root.unmount();
        });
    });

    it('createFetch composes baseUrl, options and lifecycle callbacks', async () => {
        const baseOnResponse = vi.fn();
        const localOnResponse = vi.fn();
        const mockResponse = new Response(JSON.stringify({ name: 'alice' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

        const fetchMock = vi.fn().mockResolvedValue(mockResponse);
        (globalThis as any).fetch = fetchMock;

        const useApiFetch = createFetch(
            'https://api.example.com/v1',
            { headers: { 'x-base': '1' } },
            { immediate: false, refetch: false, onResponse: baseOnResponse },
        );

        const snapshots: UseFetchReturn<any>[] = [];
        const root = renderHarness(
            () => useApiFetch('/users', { headers: { 'x-local': '2' } }, { onResponse: localOnResponse }),
            (snapshot) => snapshots.push(snapshot),
        );

        await act(async () => {
            await Promise.resolve();
        });

        await act(async () => {
            await snapshots[0].json().execute();
            await Promise.resolve();
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/v1/users');
        expect(fetchMock.mock.calls[0][1]).toMatchObject({
            headers: {
                'x-base': '1',
                'x-local': '2',
            },
        });
        expect(baseOnResponse).toHaveBeenCalledTimes(1);
        expect(localOnResponse).toHaveBeenCalledTimes(1);

        act(() => {
            root.unmount();
        });
    });

    it('createFetch keeps absolute url unchanged', async () => {
        const mockResponse = new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
        const fetchMock = vi.fn().mockResolvedValue(mockResponse);
        (globalThis as any).fetch = fetchMock;

        const useApiFetch = createFetch('https://api.example.com', {}, { immediate: false, refetch: false });
        const snapshots: UseFetchReturn<any>[] = [];
        const root = renderHarness(
            () => useApiFetch('https://other.example.com/ping', {}, {}),
            (snapshot) => snapshots.push(snapshot),
        );

        await act(async () => {
            await Promise.resolve();
        });

        await act(async () => {
            await snapshots[0].execute();
            await Promise.resolve();
        });

        expect(fetchMock.mock.calls[0][0]).toBe('https://other.example.com/ping');

        act(() => {
            root.unmount();
        });
    });

    it('runs immediate fetch on mount when immediate=true', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
        (globalThis as any).fetch = fetchMock;
        const config = { immediate: true, refetch: false };

        const snapshots: UseFetchReturn<any>[] = [];
        const root = renderHarness(
            () => useFetch('/api/immediate', {}, config),
            (snapshot) => snapshots.push(snapshot),
        );

        await act(async () => {
            await Promise.resolve();
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(snapshots.at(-1)?.isFetching).toBe(false);

        act(() => {
            root.unmount();
        });
    });

    it('runs mount refetch branch when immediate=false and refetch=true', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
        (globalThis as any).fetch = fetchMock;
        const config = { immediate: false, refetch: true, deps: [] as unknown[] };

        const snapshots: UseFetchReturn<any>[] = [];
        const root = renderHarness(
            () => useFetch('/api/refetch-on-mount', {}, config),
            (snapshot) => snapshots.push(snapshot),
        );

        await act(async () => {
            await Promise.resolve();
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(snapshots.length).toBeGreaterThan(0);

        act(() => {
            root.unmount();
        });
    });

    it('invokes before/after and final error callbacks on non-retry failure', async () => {
        const beforeFetch = vi.fn();
        const afterFetch = vi.fn();
        const onError = vi.fn();
        const configFinally = vi.fn();
        const registeredFinally = vi.fn();

        const fetchMock = vi.fn().mockRejectedValue(new Error('hard-fail'));
        (globalThis as any).fetch = fetchMock;

        const snapshots: UseFetchReturn<any>[] = [];
        const root = renderHarness(
            () => useFetch('/api/fail', {}, { immediate: false, refetch: false, beforeFetch, afterFetch, onError, onFinally: configFinally }),
            (snapshot) => snapshots.push(snapshot),
        );

        await act(async () => {
            await Promise.resolve();
        });

        await act(async () => {
            snapshots[0].onFinally(registeredFinally);
            await snapshots[0].execute();
            await Promise.resolve();
        });

        expect(beforeFetch).toHaveBeenCalledTimes(1);
        expect(afterFetch).toHaveBeenCalledTimes(0);
        expect(onError).toHaveBeenCalledTimes(1);
        expect(configFinally).toHaveBeenCalledTimes(1);
        expect(registeredFinally).toHaveBeenCalledTimes(1);
        expect(snapshots.at(-1)?.error).toBeInstanceOf(Error);

        act(() => {
            root.unmount();
        });
    });

    it('supports numeric retryDelay branch', async () => {
        vi.useFakeTimers();
        const timerSpy = vi.spyOn(globalThis, 'setTimeout');

        const fetchMock = vi.fn()
            .mockRejectedValueOnce(new Error('once'))
            .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
        (globalThis as any).fetch = fetchMock;

        const snapshots: UseFetchReturn<any>[] = [];
        const root = renderHarness(
            () => useFetch('/api/retry-delay-number', {}, { immediate: false, refetch: false, retry: 1, retryDelay: 50 }),
            (snapshot) => snapshots.push(snapshot),
        );

        await act(async () => {
            await Promise.resolve();
        });

        await act(async () => {
            const pending = snapshots[0].json().execute();
            await vi.advanceTimersByTimeAsync(50);
            await pending;
            await Promise.resolve();
        });

        expect(timerSpy).toHaveBeenCalledWith(expect.any(Function), 50);
        expect(fetchMock).toHaveBeenCalledTimes(2);

        act(() => {
            root.unmount();
        });
    });

    it('covers HTTP method chains and text/custom format chains', async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response('ok-get', { status: 200 }))
            .mockResolvedValueOnce(new Response('ok-post', { status: 200 }))
            .mockResolvedValueOnce(new Response('ok-put', { status: 200 }))
            .mockResolvedValueOnce(new Response('ok-delete', { status: 200 }))
            .mockResolvedValueOnce(new Response('ok-patch', { status: 200 }))
            .mockResolvedValueOnce(new Response('ok-head', { status: 200 }))
            .mockResolvedValueOnce(new Response('ok-options', { status: 200 }))
            .mockResolvedValueOnce(new Response('text-data', { status: 200 }))
            .mockResolvedValueOnce(new Response('custom-data', { status: 200 }));
        (globalThis as any).fetch = fetchMock;

        const snapshots: UseFetchReturn<any>[] = [];
        const root = renderHarness(
            () => useFetch('/api/chains', {}, { immediate: false, refetch: false }),
            (snapshot) => snapshots.push(snapshot),
        );

        await act(async () => {
            await Promise.resolve();
        });

        const h = snapshots[0];
        await act(async () => {
            await h.get().execute();
            await h.post().execute();
            await h.put().execute();
            await h.delete().execute();
            await h.patch().execute();
            await h.head().execute();
            await h.options().execute();
            await h.text().execute();
            await h.custom(async (r) => ({ wrapped: await r.text() })).execute();
            await Promise.resolve();
        });

        const methods = fetchMock.mock.calls.slice(0, 7).map((c) => c[1]?.method);
        expect(methods).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']);
        expect(snapshots.at(-1)?.data).toEqual({ wrapped: 'custom-data' });

        act(() => {
            root.unmount();
        });
    });

    it('covers blob and arrayBuffer chains', async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response('blob-data', { status: 200 }))
            .mockResolvedValueOnce(new Response('ab-data', { status: 200 }));
        (globalThis as any).fetch = fetchMock;

        const snapshots: UseFetchReturn<any>[] = [];
        const root = renderHarness(
            () => useFetch('/api/binary', {}, { immediate: false, refetch: false }),
            (snapshot) => snapshots.push(snapshot),
        );

        await act(async () => {
            await Promise.resolve();
        });

        await act(async () => {
            await snapshots[0].blob().execute();
            await snapshots[0].arrayBuffer().execute();
            await Promise.resolve();
        });

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(snapshots.at(-1)?.data).toBeInstanceOf(ArrayBuffer);

        act(() => {
            root.unmount();
        });
    });

    it('createFetch handles slash join branches and composed finally callbacks', async () => {
        const baseFinally = vi.fn();
        const localFinally = vi.fn();
        const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
        (globalThis as any).fetch = fetchMock;

        const useA = createFetch('https://api.example.com/', {}, { immediate: false, refetch: false, onFinally: baseFinally });
        const useB = createFetch('https://api.example.com', {}, { immediate: false, refetch: false, onFinally: baseFinally });

        const snapshotsA: UseFetchReturn<any>[] = [];
        const rootA = renderHarness(
            () => useA('/slash', {}, { onFinally: localFinally }),
            (snapshot) => snapshotsA.push(snapshot),
        );
        const snapshotsB: UseFetchReturn<any>[] = [];
        const rootB = renderHarness(
            () => useB('noslash', {}, { onFinally: localFinally }),
            (snapshot) => snapshotsB.push(snapshot),
        );

        await act(async () => {
            await Promise.resolve();
        });

        await act(async () => {
            await snapshotsA[0].execute();
            await snapshotsB[0].execute();
            await Promise.resolve();
        });

        expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/slash');
        expect(fetchMock.mock.calls[1][0]).toBe('https://api.example.com/noslash');
        expect(baseFinally).toHaveBeenCalledTimes(2);
        expect(localFinally).toHaveBeenCalledTimes(2);

        act(() => {
            rootA.unmount();
            rootB.unmount();
        });
    });
});
