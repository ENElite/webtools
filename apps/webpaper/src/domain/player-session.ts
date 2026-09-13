import type { MediaItem } from './media-item';

export type PlayerMode =
    | { readonly kind: 'current' }
    | { readonly kind: 'history'; readonly cursor: number };

export type AutoplayIntent =
    | { readonly kind: 'stopped' }
    | { readonly kind: 'running'; readonly intervalMs: number };

export interface PlayerSession {
    readonly items: readonly MediaItem[];
    readonly cursor: number | null;
    readonly history: readonly MediaItem[];
    readonly mode: PlayerMode;
    /** Scheduling is owned by the runtime; the domain stores intent only. */
    readonly autoplay: AutoplayIntent;
}

export type PlayerSessionEvent =
    | { readonly type: 'items.replaced'; readonly items: readonly MediaItem[]; readonly cursor?: number }
    | { readonly type: 'items.appended'; readonly items: readonly MediaItem[] }
    | { readonly type: 'navigation.moved'; readonly delta: number }
    | { readonly type: 'navigation.selected'; readonly cursor: number }
    | { readonly type: 'history.entered'; readonly cursor?: number }
    | { readonly type: 'history.left' }
    | { readonly type: 'autoplay.started'; readonly intervalMs: number }
    | { readonly type: 'autoplay.stopped' }
    | { readonly type: 'autoplay.tick' };

export function createPlayerSession(items: readonly MediaItem[] = []): PlayerSession {
    const cursor = items.length > 0 ? 0 : null;
    const current = cursor === null ? undefined : items[cursor];
    return {
        items: [...items],
        cursor,
        history: current ? [current] : [],
        mode: { kind: 'current' },
        autoplay: { kind: 'stopped' },
    };
}

export function selectCurrentMedia(session: PlayerSession): MediaItem | null {
    if (session.mode.kind === 'history') {
        return session.history[session.mode.cursor] ?? null;
    }
    return session.cursor === null ? null : session.items[session.cursor] ?? null;
}

/** Returns the media reached by the next forward navigation, without mutating history. */
export function selectNextMedia(session: PlayerSession): MediaItem | null {
    if (session.mode.kind === 'history') {
        if (session.history.length < 2) return null;
        const cursor = wrapCursor(session.mode.cursor + 1, session.history.length);
        return session.history[cursor] ?? null;
    }
    if (session.cursor === null) return null;
    return session.items[session.cursor + 1] ?? null;
}

export function reducePlayerSession(
    session: PlayerSession,
    event: PlayerSessionEvent,
): PlayerSession {
    switch (event.type) {
        case 'items.replaced': {
            if (event.items.length === 0) {
                return {
                    ...session,
                    items: [],
                    cursor: null,
                    mode: { kind: 'current' },
                    autoplay: { kind: 'stopped' },
                };
            }
            const cursor = clampCursor(event.cursor ?? 0, event.items.length);
            return recordCurrent({
                ...session,
                items: [...event.items],
                cursor,
                mode: { kind: 'current' },
            });
        }

        case 'items.appended':
            if (event.items.length === 0) return session;
            return recordCurrent({
                ...session,
                items: [...session.items, ...event.items],
                cursor: session.cursor ?? 0,
            });

        case 'navigation.moved':
            if (!Number.isInteger(event.delta) || event.delta === 0) return session;
            if (session.mode.kind === 'history') {
                if (session.history.length === 0) return { ...session, mode: { kind: 'current' } };
                return {
                    ...session,
                    mode: {
                        kind: 'history',
                        cursor: wrapCursor(session.mode.cursor + event.delta, session.history.length),
                    },
                };
            }
            if (session.cursor === null || session.items.length === 0) return session;
            return moveCurrentCursor(session, session.cursor + event.delta);

        case 'navigation.selected':
            if (!Number.isInteger(event.cursor) || session.items.length === 0) return session;
            return recordCurrent({
                ...session,
                cursor: clampCursor(event.cursor, session.items.length),
                mode: { kind: 'current' },
            });

        case 'history.entered': {
            if (session.history.length === 0) return session;
            const cursor = clampCursor(event.cursor ?? session.history.length - 1, session.history.length);
            return { ...session, mode: { kind: 'history', cursor } };
        }

        case 'history.left':
            return session.mode.kind === 'current'
                ? session
                : { ...session, mode: { kind: 'current' } };

        case 'autoplay.started': {
            if (!Number.isFinite(event.intervalMs) || event.intervalMs <= 0) return session;
            return {
                ...session,
                autoplay: { kind: 'running', intervalMs: Math.max(1_000, Math.round(event.intervalMs)) },
            };
        }

        case 'autoplay.stopped':
            return session.autoplay.kind === 'stopped'
                ? session
                : { ...session, autoplay: { kind: 'stopped' } };

        case 'autoplay.tick': {
            if (session.autoplay.kind !== 'running' || session.mode.kind === 'history') return session;
            if (session.cursor === null || session.cursor >= session.items.length - 1) {
                return { ...session, autoplay: { kind: 'stopped' } };
            }
            return moveCurrentCursor(session, session.cursor + 1);
        }
    }
}

function moveCurrentCursor(session: PlayerSession, desiredCursor: number): PlayerSession {
    const cursor = clampCursor(desiredCursor, session.items.length);
    if (cursor === session.cursor) return session;
    return recordCurrent({ ...session, cursor });
}

function recordCurrent(session: PlayerSession): PlayerSession {
    const current = session.cursor === null ? undefined : session.items[session.cursor];
    if (!current || session.history.at(-1)?.id === current.id) return session;
    return { ...session, history: [...session.history, current] };
}

function clampCursor(cursor: number, length: number): number {
    return Math.max(0, Math.min(cursor, length - 1));
}

function wrapCursor(cursor: number, length: number): number {
    return ((cursor % length) + length) % length;
}
