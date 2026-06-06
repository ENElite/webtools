import React, { useEffect } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_FONT_FAMILIES, type FontFamilyOption, useLocalFonts } from '@webwidget/src/hooks/useLocalFonts';

type WindowWithLocalFonts = Window & {
    queryLocalFonts?: () => Promise<Array<{
        family?: string;
    }>>;
};

function Harness({
    candidates,
    onSnapshot,
}: {
    candidates: FontFamilyOption[];
    onSnapshot: (snapshot: FontFamilyOption[]) => void;
}) {
    const snapshot = useLocalFonts(candidates);

    useEffect(() => {
        onSnapshot(snapshot);
    }, [onSnapshot, snapshot]);

    return null;
}

function renderHarness(candidates: FontFamilyOption[], onSnapshot: (snapshot: FontFamilyOption[]) => void): Root {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
        root.render(<Harness candidates={candidates} onSnapshot={onSnapshot} />);
    });

    return root;
}

describe('useLocalFonts', () => {
    let originalQueryLocalFonts: WindowWithLocalFonts['queryLocalFonts'];
    let originalActEnvironment: boolean | undefined;

    beforeEach(() => {
        originalQueryLocalFonts = (window as WindowWithLocalFonts).queryLocalFonts;
        originalActEnvironment = (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    });

    afterEach(() => {
        (window as WindowWithLocalFonts).queryLocalFonts = originalQueryLocalFonts;
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
        document.body.innerHTML = '';
    });

    it('prefers Local Font Access API when available', async () => {
        const queryLocalFonts = vi.fn().mockResolvedValue([
            { family: 'Arial' },
            { family: 'Inter' },
            { family: 'Times New Roman' },
        ]);
        (window as WindowWithLocalFonts).queryLocalFonts = queryLocalFonts;

        const snapshots: FontFamilyOption[][] = [];
        const root = renderHarness(DEFAULT_FONT_FAMILIES.slice(0, 2), (snapshot) => {
            snapshots.push(snapshot);
        });

        await act(async () => {
            await Promise.resolve();
        });

        expect(queryLocalFonts).toHaveBeenCalledTimes(1);
        expect(snapshots.at(-1)).toEqual([
            { label: 'Arial', value: 'Arial' },
            { label: 'Inter', value: 'Inter' },
            { label: 'Times New Roman', value: 'Times New Roman' },
        ]);

        act(() => {
            root.unmount();
        });
    });

    it('deduplicates fonts by family name', async () => {
        const queryLocalFonts = vi.fn().mockResolvedValue([
            { family: 'Consola' },
            { family: 'Consola' },
            { family: 'Consola' },
            { family: 'Bahnschrift' },
            { family: 'Bahnschrift' },
            { family: 'Arial' },
        ]);
        (window as WindowWithLocalFonts).queryLocalFonts = queryLocalFonts;

        const snapshots: FontFamilyOption[][] = [];
        const root = renderHarness([], (snapshot) => {
            snapshots.push(snapshot);
        });

        await act(async () => {
            await Promise.resolve();
        });

        expect(queryLocalFonts).toHaveBeenCalledTimes(1);
        expect(snapshots.at(-1)).toEqual([
            { label: 'Consola', value: 'Consola' },
            { label: 'Bahnschrift', value: 'Bahnschrift' },
            { label: 'Arial', value: 'Arial' },
        ]);

        act(() => {
            root.unmount();
        });
    });

    it('falls back when Local Font Access API is unavailable or rejected', async () => {
        const queryLocalFonts = vi.fn().mockRejectedValue(new Error('permission denied'));
        (window as WindowWithLocalFonts).queryLocalFonts = queryLocalFonts;

        const snapshots: FontFamilyOption[][] = [];
        const root = renderHarness(DEFAULT_FONT_FAMILIES.slice(0, 2), (snapshot) => {
            snapshots.push(snapshot);
        });

        await act(async () => {
            await Promise.resolve();
        });

        expect(queryLocalFonts).toHaveBeenCalledTimes(1);
        expect(snapshots.at(-1)).toEqual(DEFAULT_FONT_FAMILIES.slice(0, 2));

        act(() => {
            root.unmount();
        });
    });
});
