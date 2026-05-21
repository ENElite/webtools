import { useEffect, useState } from 'react';

export type FontFamilyOption = {
    label: string;
    value: string;
};

type LocalFontData = {
    family?: string;
};

type LocalFontQueryWindow = Window & {
    queryLocalFonts?: () => Promise<LocalFontData[]>;
};

export const DEFAULT_FONT_FAMILIES: FontFamilyOption[] = [
    { label: 'System UI', value: 'system-ui, sans-serif' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Inter', value: 'Inter, system-ui, sans-serif' },
    { label: 'PingFang SC', value: '"PingFang SC", "Microsoft YaHei", sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
    { label: 'SF Mono', value: '"SFMono-Regular", Consolas, "Liberation Mono", monospace' },
];

function buildFontOptions(localFonts: LocalFontData[]): FontFamilyOption[] {
    const seen = new Set<string>();
    const options: FontFamilyOption[] = [];

    for (const font of localFonts) {
        const family = font.family?.trim();
        if (!family) continue;

        const key = family.toLowerCase();
        if (seen.has(key)) continue;

        seen.add(key);
        options.push({
            label: family,
            value: family,
        });
    }

    return options;
}

function extractPrimaryFontName(fontValue: string): string {
    const parts = fontValue.split(',');
    return (parts[0] ?? '').replace(/^["']|["']$/g, '').trim();
}

function detectAvailableFonts(candidates: FontFamilyOption[]): FontFamilyOption[] {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
        return candidates;
    }

    const baseFonts = ['monospace', 'serif', 'sans-serif'];
    const testString = 'mmmmmmmmmmlliI1';
    const defaultWidths: Record<string, number> = {};
    const span = document.createElement('span');

    span.style.fontSize = '72px';
    span.style.position = 'absolute';
    span.style.left = '-9999px';
    span.style.visibility = 'hidden';
    span.textContent = testString;
    document.body.appendChild(span);

    try {
        for (const base of baseFonts) {
            span.style.fontFamily = base;
            defaultWidths[base] = span.getBoundingClientRect().width || span.offsetWidth || 0;
        }

        const available: FontFamilyOption[] = [];

        for (const candidate of candidates) {
            const primary = extractPrimaryFontName(candidate.value);
            if (!primary) continue;

            let detected = false;

            for (const base of baseFonts) {
                span.style.fontFamily = `${primary}, ${base}`;
                const currentWidth = span.getBoundingClientRect().width || span.offsetWidth || 0;
                if (currentWidth !== defaultWidths[base]) {
                    detected = true;
                    break;
                }
            }

            if (detected) {
                available.push(candidate);
            }
        }

        return available.length > 0 ? available : candidates;
    } finally {
        span.remove();
    }
}

async function queryLocalFonts(candidates: FontFamilyOption[]): Promise<FontFamilyOption[] | null> {
    if (typeof window === 'undefined') {
        return null;
    }

    const query = (window as LocalFontQueryWindow).queryLocalFonts;
    if (typeof query !== 'function') {
        return null;
    }

    try {
        const localFonts = await query.call(window);
        if (!Array.isArray(localFonts) || localFonts.length === 0) {
            return null;
        }

        console.log('[useLocalFonts] localFonts:', localFonts);
        const result = buildFontOptions(localFonts);
        return result.length > 0 ? result : candidates;
    } catch {
        return null;
    }
}

export function useLocalFonts(candidates: FontFamilyOption[] = DEFAULT_FONT_FAMILIES): FontFamilyOption[] {
    const [availableFonts, setAvailableFonts] = useState<FontFamilyOption[]>(candidates);

    useEffect(() => {
        let cancelled = false;

        const resolveFonts = async () => {
            const localFonts = await queryLocalFonts(candidates);
            if (cancelled) return;

            if (localFonts) {
                setAvailableFonts(localFonts);
                return;
            }

            setAvailableFonts(detectAvailableFonts(candidates));
        };

        void resolveFonts();

        return () => {
            cancelled = true;
        };
    }, [candidates]);

    return availableFonts;
}

export default useLocalFonts;
