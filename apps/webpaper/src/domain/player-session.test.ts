import { describe, expect, it } from 'vitest';

import type { ImageMediaItem } from './media-item';
import {
    createPlayerSession,
    reducePlayerSession,
    selectCurrentMedia,
    selectNextMedia,
} from './player-session';

function image(id: string): ImageMediaItem {
    return {
        id,
        sourceId: 'json',
        kind: 'image',
        url: `/${id}.jpg`,
        raw: null,
    };
}

describe('player session state machine', () => {
    it('navigates within bounds and records only successful visits', () => {
        const initial = createPlayerSession([image('a'), image('b'), image('c')]);
        const next = reducePlayerSession(initial, { type: 'navigation.moved', delta: 1 });
        const last = reducePlayerSession(next, { type: 'navigation.moved', delta: 20 });
        const stillLast = reducePlayerSession(last, { type: 'navigation.moved', delta: 1 });

        expect(initial.cursor).toBe(0);
        expect(next.cursor).toBe(1);
        expect(last.cursor).toBe(2);
        expect(stillLast).toBe(last);
        expect(last.history.map((item) => item.id)).toEqual(['a', 'b', 'c']);
        expect(selectCurrentMedia(last)?.id).toBe('c');
        expect(selectNextMedia(initial)?.id).toBe('b');
        expect(selectNextMedia(last)).toBeNull();
    });

    it('has an explicit history mode with circular history navigation', () => {
        let session = createPlayerSession([image('a'), image('b'), image('c')]);
        session = reducePlayerSession(session, { type: 'navigation.moved', delta: 1 });
        session = reducePlayerSession(session, { type: 'navigation.moved', delta: 1 });
        session = reducePlayerSession(session, { type: 'history.entered' });
        session = reducePlayerSession(session, { type: 'navigation.moved', delta: 1 });

        expect(session.mode).toEqual({ kind: 'history', cursor: 0 });
        expect(selectCurrentMedia(session)?.id).toBe('a');
        expect(selectNextMedia(session)?.id).toBe('b');

        session = reducePlayerSession(session, { type: 'history.left' });
        expect(selectCurrentMedia(session)?.id).toBe('c');
    });

    it('stores autoplay intent without runtime timer state', () => {
        let session = createPlayerSession([image('a'), image('b')]);
        session = reducePlayerSession(session, { type: 'autoplay.started', intervalMs: 250 });
        expect(session.autoplay).toEqual({ kind: 'running', intervalMs: 1000 });
        expect('timerId' in session).toBe(false);

        session = reducePlayerSession(session, { type: 'autoplay.tick' });
        expect(selectCurrentMedia(session)?.id).toBe('b');
        expect(session.autoplay.kind).toBe('running');

        session = reducePlayerSession(session, { type: 'autoplay.tick' });
        expect(session.autoplay).toEqual({ kind: 'stopped' });
    });

    it('stops autoplay and clears the current cursor when items are emptied', () => {
        const running = reducePlayerSession(
            createPlayerSession([image('a')]),
            { type: 'autoplay.started', intervalMs: 5000 },
        );
        const empty = reducePlayerSession(running, { type: 'items.replaced', items: [] });

        expect(empty.cursor).toBeNull();
        expect(empty.autoplay.kind).toBe('stopped');
        expect(selectCurrentMedia(empty)).toBeNull();
    });

    it('selects and records the first item appended to an empty session', () => {
        const session = reducePlayerSession(
            createPlayerSession(),
            { type: 'items.appended', items: [image('first')] },
        );

        expect(session.cursor).toBe(0);
        expect(session.history.map((item) => item.id)).toEqual(['first']);
        expect(selectCurrentMedia(session)?.id).toBe('first');
    });
});
