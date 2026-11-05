import { describe, expect, it } from 'vitest';
import { countText } from './word-count';

describe('countText', () => {
    it('returns zero for empty input', () => {
        expect(Object.values(countText(''))).toEqual([0, 0, 0, 0, 0, 0, 0]);
    });

    it('counts mixed Chinese, English, punctuation and numbers independently', () => {
        expect(countText('你好 Hello world! 123')).toEqual({
            characters: 19,
            charactersWithoutWhitespace: 16,
            hanCharacters: 2,
            englishWords: 2,
            digits: 3,
            lines: 1,
            paragraphs: 1,
        });
    });

    it('counts combined emoji and combining marks as single characters', () => {
        expect(countText('👨‍👩‍👧‍👦👍🏽e\u0301𠮷')).toMatchObject({
            characters: 4,
            charactersWithoutWhitespace: 4,
            hanCharacters: 1,
        });
    });

    it('normalizes Windows and old Mac newlines and splits paragraphs on blank lines', () => {
        expect(countText('一\r\n二\r\n \t\r\n三\r')).toMatchObject({
            characters: 9,
            charactersWithoutWhitespace: 3,
            lines: 5,
            paragraphs: 2,
        });
    });

    it('ignores whitespace-only paragraphs, including Unicode whitespace', () => {
        expect(countText(' \t\n\u3000\n')).toMatchObject({
            charactersWithoutWhitespace: 0,
            lines: 3,
            paragraphs: 0,
        });
    });

    it('keeps contractions and hyphenated English words together', () => {
        expect(countText("don't well-known it’s １２3")).toMatchObject({ englishWords: 3, digits: 3 });
    });

    it('recognizes Unicode spaces on blank paragraph separators', () => {
        expect(countText('第一段\n\u3000\n第二段').paragraphs).toBe(2);
    });
});
