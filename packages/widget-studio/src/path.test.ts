import { describe, expect, it } from 'vitest';

import { readPath, writePath } from './path';

describe('typed form paths', () => {
    it('reads and immutably writes nested JSON properties', () => {
        const source = { props: { text: 'before', nested: { count: 1 } } } as const;
        const next = writePath(source, 'props.nested.count', 2);

        expect(readPath(next, 'props.nested.count')).toBe(2);
        expect(readPath(source, 'props.nested.count')).toBe(1);
        expect(next).not.toBe(source);
    });

    it('can remove a property without mutating its input', () => {
        const source = { props: { text: 'hello' } } as const;
        const next = writePath(source, 'props.text', undefined);

        expect(readPath(next, 'props.text')).toBeUndefined();
        expect(readPath(source, 'props.text')).toBe('hello');
    });
});
