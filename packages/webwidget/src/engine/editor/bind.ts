import type { BindPath } from './types';

export type BindValueEntry = {
    key: string;
    value: any;
};

function readPath(source: any, path: string): any {
    if (!path) {
        return undefined;
    }

    return path.split('.').reduce((current: any, segment: string) => {
        if (current == null) {
            return undefined;
        }

        return current[segment];
    }, source);
}

export function getBindValueEntries(source: any, bind?: BindPath): BindValueEntry[] {
    if (!bind) {
        return [];
    }

    const paths = Array.isArray(bind) ? bind : [bind];

    return paths
        .map((key) => ({
            key,
            value: readPath(source, key),
        }));
}
