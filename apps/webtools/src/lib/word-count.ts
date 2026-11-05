export interface TextStatistics {
    characters: number;
    charactersWithoutWhitespace: number;
    hanCharacters: number;
    englishWords: number;
    digits: number;
    lines: number;
    paragraphs: number;
}

const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' });

/** Count visible characters as grapheme clusters, including combined emoji as one. */
export function countText(text: string): TextStatistics {
    const normalized = text.replace(/\r\n?/g, '\n');
    let characters = 0;
    let charactersWithoutWhitespace = 0;

    for (const { segment } of segmenter.segment(normalized)) {
        characters += 1;
        if (/\S/u.test(segment)) charactersWithoutWhitespace += 1;
    }

    return {
        characters,
        charactersWithoutWhitespace,
        hanCharacters: (normalized.match(/\p{Script=Han}/gu) ?? []).length,
        englishWords: (normalized.match(/[a-zA-Z]+(?:['’-][a-zA-Z]+)*/g) ?? []).length,
        digits: (normalized.match(/\p{Decimal_Number}/gu) ?? []).length,
        lines: normalized.length === 0 ? 0 : normalized.split('\n').length,
        paragraphs: normalized.split(/\n[^\S\n]*\n/u).filter((part) => part.trim().length > 0).length,
    };
}
