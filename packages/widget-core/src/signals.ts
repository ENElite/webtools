/** A synchronous slot connected to one signal type. */
export type SignalSlot<TPayload> = (payload: TPayload) => void;

/** Idempotent function returned by {@link SignalHub.connect}. */
export type DisconnectSignal = () => void;

export interface SignalSlotError<TMap extends object> {
    readonly type: keyof TMap;
    readonly payload: TMap[keyof TMap];
    readonly error: unknown;
}

export interface SignalHubOptions<TMap extends object> {
    /**
     * Slot failures are isolated so one consumer cannot prevent later slots from running.
     * This observer is also isolated; throwing from it never interrupts signal delivery.
     */
    readonly onSlotError?: (failure: SignalSlotError<TMap>) => void;
}

export interface SignalHub<TMap extends object> {
    /** Emits synchronously to the slots that were connected when this dispatch began. */
    emit<K extends keyof TMap>(type: K, payload: TMap[K]): void;
    /**
     * Connects a slot in insertion order. A slot connected during an emit starts with
     * the next emit; a slot disconnected before its turn is skipped immediately.
     */
    connect<K extends keyof TMap>(type: K, slot: SignalSlot<TMap[K]>): DisconnectSignal;
}

interface SlotRecord<TPayload> {
    active: boolean;
    readonly slot: SignalSlot<TPayload>;
}

/** Creates an isolated, synchronous, insertion-ordered typed signal hub. */
export function createSignalHub<TMap extends object>(
    options: SignalHubOptions<TMap> = {},
): SignalHub<TMap> {
    type AnyPayload = TMap[keyof TMap];
    const slots = new Map<keyof TMap, Set<SlotRecord<AnyPayload>>>();

    return Object.freeze({
        emit<K extends keyof TMap>(type: K, payload: TMap[K]): void {
            const records = slots.get(type);
            if (!records?.size) return;

            // Snapshotting excludes connections created during this emit. The active
            // bit still lets an earlier slot disconnect a later snapshot member.
            for (const record of [...records]) {
                if (!record.active) continue;
                try {
                    record.slot(payload);
                } catch (error: unknown) {
                    try {
                        options.onSlotError?.({
                            type,
                            payload: payload as AnyPayload,
                            error,
                        });
                    } catch {
                        // Error observers are diagnostic only and cannot break delivery.
                    }
                }
            }
        },
        connect<K extends keyof TMap>(type: K, slot: SignalSlot<TMap[K]>): DisconnectSignal {
            let records = slots.get(type);
            if (!records) {
                records = new Set();
                slots.set(type, records);
            }
            const record: SlotRecord<AnyPayload> = {
                active: true,
                slot: slot as SignalSlot<AnyPayload>,
            };
            records.add(record);

            return () => {
                if (!record.active) return;
                record.active = false;
                records?.delete(record);
                if (records?.size === 0) slots.delete(type);
            };
        },
    });
}

/** Stable namespaced identity used as the source of component lifecycle signals. */
export type ComponentId = `${string}:${string}`;

/** Produces the shared `<namespace>:<id>` identity convention. */
export function componentId(namespace: string, id: string | number): ComponentId {
    if (!namespace || namespace.includes(':')) {
        throw new TypeError('Component namespace must be non-empty and cannot contain ":".');
    }
    const localId = String(id);
    if (!localId) throw new TypeError('Component id must be non-empty.');
    return `${namespace}:${localId}`;
}

/** Canonical widget identity shared by WidgetCanvas and application barriers. */
export function widgetComponentId(widgetId: string): ComponentId {
    return componentId('widget', widgetId);
}

declare const componentLoadAttemptIdBrand: unique symbol;

/** Hub-local, monotonically generated identity for one concrete load attempt. */
export type ComponentLoadAttemptId = string & {
    readonly [componentLoadAttemptIdBrand]: true;
};

export interface ComponentLoadSource {
    readonly componentId: ComponentId;
    /** Stable identity of the resource requested by this attempt. */
    readonly resourceKey: string;
    /** Distinguishes retries even when they load the same resource key. */
    readonly attemptId: ComponentLoadAttemptId;
}

export interface ComponentLoadStartSignal {
    readonly source: ComponentLoadSource;
}

export interface ComponentLoadProgressSignal {
    readonly source: ComponentLoadSource;
    readonly loaded: number;
    readonly total: number;
}

export interface ComponentLoadCompleteSignal {
    readonly source: ComponentLoadSource;
    /** Present on barrier completion; component completions may omit it. */
    readonly failedIds?: readonly ComponentId[];
}

export interface ComponentLoadErrorSignal {
    readonly source: ComponentLoadSource;
    readonly error: unknown;
}

/** Base signal contract shared by resource components and first-screen barriers. */
export interface ComponentLoadSignalMap {
    readonly 'component.load.start': ComponentLoadStartSignal;
    readonly 'component.load.progress': ComponentLoadProgressSignal;
    readonly 'component.load.complete': ComponentLoadCompleteSignal;
    readonly 'component.load.error': ComponentLoadErrorSignal;
}

export interface ComponentTimeTickSignal {
    /** Clock or session publishing the shared timebase. */
    readonly source: ComponentId;
    /** Epoch timestamp in milliseconds. */
    readonly now: number;
}

export interface ComponentMessageSignal {
    readonly source: ComponentId;
    /** Omit to broadcast to all topic subscribers. */
    readonly target?: ComponentId;
    readonly topic: string;
    readonly payload: unknown;
}

/** Shared component communication contract; applications may extend this map further. */
export interface ComponentRuntimeSignalMap extends ComponentLoadSignalMap {
    readonly 'component.time.tick': ComponentTimeTickSignal;
    readonly 'component.message': ComponentMessageSignal;
}

export interface ComponentLoadAttempt {
    readonly source: ComponentLoadSource;
    /** Emits progress while this attempt is active. Calls after a terminal method are ignored. */
    progress(loaded: number, total: number): void;
    /** Emits completion once. Repeated terminal calls are ignored. */
    complete(failedIds?: readonly ComponentId[]): void;
    /** Emits failure once. Repeated terminal calls are ignored. */
    error(error: unknown): void;
    /** Silently invalidates the attempt, for example during StrictMode effect cleanup. */
    dispose(): void;
}

export interface ComponentLoadPort {
    readonly componentId: ComponentId;
    /** Starts a new attempt and silently invalidates the previous attempt from this port. */
    start(resourceKey: string): ComponentLoadAttempt;
    dispose(): void;
}

export interface ComponentLoadPortOptions {
    readonly hub: SignalHub<ComponentLoadSignalMap>;
    readonly componentId: ComponentId;
}

const attemptCounters = new WeakMap<object, number>();

function nextAttemptId(
    hub: SignalHub<ComponentLoadSignalMap>,
    sourceId: ComponentId,
): ComponentLoadAttemptId {
    const next = (attemptCounters.get(hub) ?? 0) + 1;
    attemptCounters.set(hub, next);
    return `${sourceId}@${next}` as ComponentLoadAttemptId;
}

/**
 * Creates the publishing side of the component loading protocol. Attempt methods
 * are idempotent, and retrying the same resource still gets a fresh attempt id.
 */
export function createComponentLoadPort(options: ComponentLoadPortOptions): ComponentLoadPort {
    let disposeCurrent: (() => void) | undefined;
    let disposed = false;

    return Object.freeze({
        componentId: options.componentId,
        start(resourceKey: string): ComponentLoadAttempt {
            if (disposed) throw new Error('Cannot start a disposed component load port.');
            if (!resourceKey) throw new TypeError('Component load resource key must be non-empty.');

            disposeCurrent?.();
            let active = true;
            const source: ComponentLoadSource = Object.freeze({
                componentId: options.componentId,
                resourceKey,
                attemptId: nextAttemptId(options.hub, options.componentId),
            });
            const dispose = () => {
                active = false;
            };
            disposeCurrent = dispose;

            const attempt: ComponentLoadAttempt = Object.freeze({
                source,
                progress(loaded: number, total: number) {
                    if (!active) return;
                    options.hub.emit('component.load.progress', { source, loaded, total });
                },
                complete(failedIds?: readonly ComponentId[]) {
                    if (!active) return;
                    active = false;
                    options.hub.emit('component.load.complete', failedIds
                        ? { source, failedIds: Object.freeze([...failedIds]) }
                        : { source });
                },
                error(error: unknown) {
                    if (!active) return;
                    active = false;
                    options.hub.emit('component.load.error', { source, error });
                },
                dispose,
            });

            options.hub.emit('component.load.start', { source });
            return attempt;
        },
        dispose() {
            if (disposed) return;
            disposed = true;
            disposeCurrent?.();
            disposeCurrent = undefined;
        },
    });
}

export interface ComponentLoadBarrierOptions {
    readonly hub: SignalHub<ComponentLoadSignalMap>;
    readonly id: ComponentId;
    /** Logical component identities. Each member's latest start determines its current attempt. */
    readonly members: readonly ComponentId[];
    /** Identity of this barrier run. Defaults to `initial`. */
    readonly resourceKey?: string;
    /** Pending members become failed when this duration elapses. Defaults to 15 seconds. */
    readonly timeoutMs?: number;
}

export interface ComponentLoadBarrierSnapshot {
    readonly status: 'idle' | 'pending' | 'complete' | 'disposed';
    readonly total: number;
    readonly settled: number;
    readonly pending: number;
    readonly failedIds: readonly ComponentId[];
}

export interface ComponentLoadBarrier {
    readonly id: ComponentId;
    readonly resourceKey: string;
    getSnapshot(): ComponentLoadBarrierSnapshot;
    /** Compatible with useSyncExternalStore; read retained state with getSnapshot. */
    subscribe(listener: () => void): DisconnectSignal;
    /** Arms subscriptions and the hard deadline. The returned cleanup may be safely repeated. */
    start(): DisconnectSignal;
    dispose(): void;
}

interface BarrierMember {
    readonly componentId: ComponentId;
    source: ComponentLoadSource | undefined;
    status: 'waiting' | 'pending' | 'complete' | 'failed';
}

const DEFAULT_LOAD_TIMEOUT_MS = 15_000;

function sameSource(left: ComponentLoadSource, right: ComponentLoadSource): boolean {
    return left.componentId === right.componentId
        && left.resourceKey === right.resourceKey
        && left.attemptId === right.attemptId;
}

function freezeBarrierSnapshot(
    status: ComponentLoadBarrierSnapshot['status'],
    members: readonly BarrierMember[],
): ComponentLoadBarrierSnapshot {
    const failedIds = Object.freeze([
        ...new Set(members
            .filter((member) => member.status === 'failed')
            .map((member) => member.componentId)),
    ]);
    const pending = members.filter((member) =>
        member.status === 'waiting' || member.status === 'pending').length;
    return Object.freeze({
        status,
        total: members.length,
        settled: members.length - pending,
        pending,
        failedIds,
    });
}

/**
 * Aggregates a fixed first-screen cohort. Construction is side-effect free; call
 * `start` before members publish. The final snapshot is retained for late consumers.
 */
export function createComponentLoadBarrier(
    options: ComponentLoadBarrierOptions,
): ComponentLoadBarrier {
    const resourceKey = options.resourceKey ?? 'initial';
    const timeoutMs = options.timeoutMs ?? DEFAULT_LOAD_TIMEOUT_MS;
    if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
        throw new RangeError('Component load barrier timeout must be a finite non-negative number.');
    }

    const members: BarrierMember[] = [];
    for (const memberId of options.members) {
        if (memberId === options.id) {
            throw new Error(`Component load barrier cannot include itself: ${memberId}`);
        }
        if (members.some((member) => member.componentId === memberId)) {
            throw new Error(`Duplicate component load member: ${memberId}`);
        }
        members.push({ componentId: memberId, source: undefined, status: 'waiting' });
    }

    const listeners = new Set<() => void>();
    const barrierPort = createComponentLoadPort({
        hub: options.hub,
        componentId: options.id,
    });
    let snapshot = freezeBarrierSnapshot('idle', members);
    let timer: ReturnType<typeof setTimeout> | null = null;
    let run = 0;
    let memberVersion = 0;
    let deadlineReached = false;
    let disconnectors: DisconnectSignal[] = [];
    let barrierAttempt: ComponentLoadAttempt | undefined;

    const notify = () => {
        for (const listener of [...listeners]) {
            if (!listeners.has(listener)) continue;
            try {
                listener();
            } catch {
                // Snapshot observers cannot interrupt lifecycle aggregation.
            }
        }
    };

    const disconnect = () => {
        for (const disconnectSlot of disconnectors) disconnectSlot();
        disconnectors = [];
        if (timer !== null) clearTimeout(timer);
        timer = null;
    };

    const publishProgress = () => {
        snapshot = freezeBarrierSnapshot('pending', members);
        barrierAttempt?.progress(snapshot.settled, snapshot.total);
        notify();
    };

    const completeIfSettled = () => {
        publishProgress();
        if (snapshot.pending > 0) return;

        // A same-tick retry (notably StrictMode effect replay) must be able to
        // supersede a seemingly terminal attempt before the barrier latches.
        const candidateVersion = memberVersion;
        queueMicrotask(() => {
            if (snapshot.status !== 'pending' || memberVersion !== candidateVersion) return;
            const candidate = freezeBarrierSnapshot('pending', members);
            if (candidate.pending > 0) return;

            snapshot = freezeBarrierSnapshot('complete', members);
            disconnect();
            const attempt = barrierAttempt;
            barrierAttempt = undefined;
            attempt?.complete(snapshot.failedIds);
            notify();
        });
    };

    const begin = (source: ComponentLoadSource) => {
        if (snapshot.status !== 'pending' || deadlineReached) return;
        const member = members.find((candidate) => candidate.componentId === source.componentId);
        if (!member) return;
        if (member.source && sameSource(member.source, source)) return;
        member.source = source;
        member.status = 'pending';
        ++memberVersion;
        publishProgress();
    };

    const settle = (source: ComponentLoadSource, status: 'complete' | 'failed') => {
        if (snapshot.status !== 'pending') return;
        const member = members.find((candidate) => candidate.componentId === source.componentId);
        if (!member?.source || member.status !== 'pending' || !sameSource(member.source, source)) return;
        member.status = status;
        ++memberVersion;
        completeIfSettled();
    };

    return Object.freeze({
        id: options.id,
        resourceKey,
        getSnapshot: () => snapshot,
        subscribe(listener: () => void) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        start() {
            if (snapshot.status === 'complete' || snapshot.status === 'disposed') return () => {};
            if (snapshot.status === 'pending') return () => {};

            const thisRun = ++run;
            ++memberVersion;
            deadlineReached = false;
            for (const member of members) {
                member.source = undefined;
                member.status = 'waiting';
            }
            snapshot = freezeBarrierSnapshot('pending', members);
            disconnectors = [
                options.hub.connect('component.load.start', ({ source }) => begin(source)),
                options.hub.connect('component.load.complete', ({ source }) => settle(source, 'complete')),
                options.hub.connect('component.load.error', ({ source }) => settle(source, 'failed')),
            ];
            barrierAttempt = barrierPort.start(resourceKey);

            if (members.length === 0) {
                completeIfSettled();
            } else {
                barrierAttempt.progress(0, members.length);
                notify();
                timer = setTimeout(() => {
                    if (snapshot.status !== 'pending' || run !== thisRun) return;
                    deadlineReached = true;
                    for (const member of members) {
                        if (member.status === 'waiting' || member.status === 'pending') {
                            member.status = 'failed';
                        }
                    }
                    ++memberVersion;
                    completeIfSettled();
                }, timeoutMs);
            }

            let active = true;
            return () => {
                if (!active) return;
                active = false;
                if (snapshot.status !== 'pending' || run !== thisRun) return;
                ++run;
                ++memberVersion;
                disconnect();
                barrierAttempt?.dispose();
                barrierAttempt = undefined;
                snapshot = freezeBarrierSnapshot('idle', members);
                notify();
            };
        },
        dispose() {
            if (snapshot.status === 'disposed') return;
            ++run;
            ++memberVersion;
            disconnect();
            barrierAttempt?.dispose();
            barrierAttempt = undefined;
            barrierPort.dispose();
            snapshot = freezeBarrierSnapshot('disposed', members);
            notify();
            listeners.clear();
        },
    });
}
