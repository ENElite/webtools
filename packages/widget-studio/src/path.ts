import type { JsonObject, JsonValue } from '@webtools/widget-core';

export function readPath(source: unknown, path: string): JsonValue | undefined {
    let current: unknown = source;
    for (const segment of path.split('.')) {
        if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
        current = (current as Record<string, unknown>)[segment];
    }
    return current as JsonValue | undefined;
}

export function writePath<T extends JsonObject>(source: T, path: string, value: JsonValue | undefined): T {
    const segments = path.split('.').filter(Boolean);
    if (segments.length === 0) return source;
    const root = structuredClone(source) as Record<string, JsonValue>;
    let current = root;

    for (const segment of segments.slice(0, -1)) {
        const existing = current[segment];
        if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
            current[segment] = {};
        }
        current = current[segment] as Record<string, JsonValue>;
    }

    const leaf = segments.at(-1);
    if (!leaf) return source;
    if (value === undefined) delete current[leaf];
    else current[leaf] = value;
    return root as T;
}
