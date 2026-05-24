function set(obj: any, path: string, value: any) {
    const parts = path.split('.');
    if (parts.length === 0) {
        return;
    }

    let cur: Record<string, any> = obj as Record<string, any>;

    for (let i = 0; i < parts.length - 1; i += 1) {
        const part = parts[i]!;
        if (cur[part] == null || typeof cur[part] !== 'object') {
            cur[part] = {};
        }
        cur = cur[part];
    }

    cur[parts[parts.length - 1]!] = value;
}

function unset(obj: any, path: string) {
    const parts = path.split('.');
    if (parts.length === 0) {
        return;
    }

    let cur: Record<string, any> = obj as Record<string, any>;

    for (let i = 0; i < parts.length - 1; i += 1) {
        const part = parts[i]!;
        if (cur[part] == null || typeof cur[part] !== 'object') {
            return;
        }
        cur = cur[part];
    }

    delete cur[parts[parts.length - 1]!];
}

export function applyChange(state: any, change: { set?: Record<string, any>; unset?: string[] }): any {
    const next = structuredClone(state);

    if (change.set) {
        Object.entries(change.set).forEach(([key, value]) => set(next, key, value));
    }

    if (change.unset) {
        change.unset.forEach((key) => unset(next, key));
    }

    return next;
}

export function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };
    for (const key of Object.keys(source)) {
        const sourceVal = source[key];
        const targetVal = result[key];
        if (
            sourceVal !== null
            && typeof sourceVal === 'object'
            && !Array.isArray(sourceVal)
            && targetVal !== null
            && typeof targetVal === 'object'
            && !Array.isArray(targetVal)
        ) {
            result[key] = deepMerge(targetVal, sourceVal);
        } else {
            result[key] = sourceVal;
        }
    }
    return result;
}

export function diffObjects(oldObj: Record<string, any>, newObj: Record<string, any>): Record<string, any> | null {
    const result: Record<string, any> = {};
    let hasChanges = false;

    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    for (const key of allKeys) {
        const oldVal = oldObj[key];
        const newVal = newObj[key];

        if (
            oldVal !== null && typeof oldVal === 'object' && !Array.isArray(oldVal)
            && newVal !== null && typeof newVal === 'object' && !Array.isArray(newVal)
        ) {
            const nested = diffObjects(oldVal, newVal);
            if (nested !== null) {
                result[key] = nested;
                hasChanges = true;
            }
        } else if (oldVal !== newVal) {
            result[key] = newVal;
            hasChanges = true;
        }
    }

    return hasChanges ? result : null;
}

export default applyChange;
