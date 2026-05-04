import { describe, expect, it } from 'vitest';

import { parseFontString, buildFontString, type FontPickerValue } from '@/features/overlay/settings/font_picker';

describe('parseFontString', () => {
    it('parses complete font string with all properties', () => {
        const result = parseFontString('italic 600 48px/1.5 Arial, sans-serif');

        expect(result.style).toBe('italic');
        expect(result.weight).toBe(600);
        expect(result.size).toBe(48);
        expect(result.lineHeight).toBe(1.5);
        expect(result.family).toBe('Arial, sans-serif');
    });

    it('parses font string with normal style', () => {
        const result = parseFontString('normal 400 16px/1.25 "Times New Roman", serif');

        expect(result.style).toBe('normal');
        expect(result.weight).toBe(400);
        expect(result.size).toBe(16);
        expect(result.lineHeight).toBe(1.25);
        expect(result.family).toBe('"Times New Roman", serif');
    });

    it('parses font string with oblique style', () => {
        const result = parseFontString('oblique 700 32px/1.3 Georgia, serif');

        expect(result.style).toBe('oblique');
        expect(result.weight).toBe(700);
        expect(result.size).toBe(32);
        expect(result.lineHeight).toBe(1.3);
    });

    it('parses font string with bold keyword', () => {
        const result = parseFontString('bold 24px/1.25 Arial, sans-serif');

        expect(result.weight).toBe(700);
        expect(result.size).toBe(24);
    });

    it('parses font string with decimal size', () => {
        const result = parseFontString('normal 400 normal 14.5px/1.2 Arial');

        expect(result.size).toBe(14.5);
        expect(result.lineHeight).toBe(1.2);
    });

    it('parses font string with size only and uses defaults for other properties', () => {
        const result = parseFontString('48px/1.25 Arial, sans-serif');

        expect(result.style).toBe('normal');
        expect(result.weight).toBe(400);
        expect(result.size).toBe(48);
        expect(result.lineHeight).toBe(1.25);
        expect(result.family).toBe('Arial, sans-serif');
    });

    it('returns default values for empty string', () => {
        const result = parseFontString('');

        expect(result.style).toBe('normal');
        expect(result.weight).toBe(400);
        expect(result.size).toBe(16);
        expect(result.lineHeight).toBe(1.25);
        expect(result.family).toContain('system-ui');
    });

    it('returns default values for undefined', () => {
        const result = parseFontString(undefined);

        expect(result.style).toBe('normal');
        expect(result.weight).toBe(400);
        expect(result.size).toBe(16);
        expect(result.lineHeight).toBe(1.25);
    });

    it('returns default values for whitespace-only string', () => {
        const result = parseFontString('   ');

        expect(result.style).toBe('normal');
        expect(result.weight).toBe(400);
    });

    it('parses font string with weight number 100', () => {
        const result = parseFontString('100 16px Arial');
        expect(result.weight).toBe(100);
    });

    it('parses font string with weight number 900', () => {
        const result = parseFontString('900 16px Arial');
        expect(result.weight).toBe(900);
    });

    it('parses font string with size and family only', () => {
        const result = parseFontString('16px Arial');
        expect(result.size).toBe(16);
    });

    it('parses font string with quoted font family', () => {
        const result = parseFontString('16px "PingFang SC", "Microsoft YaHei", sans-serif');
        expect(result.family).toBe('"PingFang SC", "Microsoft YaHei", sans-serif');
    });

    it('parses font string with size/lineHeight without size unit defaults to px', () => {
        const result = parseFontString('24/1.5 Arial');
        expect(result.size).toBe(24);
        expect(result.lineHeight).toBe(1.5);
    });

    it('handles font string with no lineHeight (uses default)', () => {
        const result = parseFontString('16px Arial');
        expect(result.size).toBe(16);
        expect(result.lineHeight).toBe(1.25);
    });

    it('handles font string with lineHeight "normal"', () => {
        const result = parseFontString('16px/normal Arial');
        expect(result.size).toBe(16);
        expect(result.lineHeight).toBe(1.25);
    });

    it('parses font string with multiple font families', () => {
        const result = parseFontString('16px Arial, Helvetica, sans-serif');
        expect(result.family).toBe('Arial, Helvetica, sans-serif');
    });

    it('ignores invalid size token and returns default', () => {
        // 字符串中没有有效的字号标记 (必须有单位或者 /)
        const result = parseFontString('invalid data 48 Arial');
        // 由于没有找到有效字号，应该返回默认值
        expect(result.size).toBe(16);
    });

    it('parses font string case-insensitively for style and weight keywords', () => {
        const result = parseFontString('ITALIC BOLD 16px Arial');
        expect(result.style).toBe('italic');
        expect(result.weight).toBe(700);
    });
});

describe('buildFontString', () => {
    it('builds complete font string from FontPickerValue', () => {
        const value: FontPickerValue = {
            style: 'italic',
            weight: 600,
            size: 48,
            lineHeight: 1.5,
            family: 'Arial, sans-serif',
        };

        const result = buildFontString(value);
        expect(result).toBe('italic 600 48px/1.5 Arial, sans-serif');
    });

    it('builds font string with normal values', () => {
        const value: FontPickerValue = {
            style: 'normal',
            weight: 400,
            size: 16,
            lineHeight: 1.25,
            family: 'system-ui, sans-serif',
        };

        const result = buildFontString(value);
        expect(result).toBe('normal 400 16px/1.25 system-ui, sans-serif');
    });

    it('builds font string with weight 700', () => {
        const value: FontPickerValue = {
            style: 'normal',
            weight: 700,
            size: 24,
            lineHeight: 1.3,
            family: 'Georgia, serif',
        };

        const result = buildFontString(value);
        expect(result).toBe('normal 700 24px/1.3 Georgia, serif');
    });

    it('builds font string with oblique style', () => {
        const value: FontPickerValue = {
            style: 'oblique',
            weight: 500,
            size: 32,
            lineHeight: 1.4,
            family: 'Arial',
        };

        const result = buildFontString(value);
        expect(result).toBe('oblique 500 32px/1.4 Arial');
    });

    it('builds font string with decimal values', () => {
        const value: FontPickerValue = {
            style: 'normal',
            weight: 400,
            size: 14.5,
            lineHeight: 1.456,
            family: 'monospace',
        };

        const result = buildFontString(value);
        expect(result).toBe('normal 400 14.5px/1.456 monospace');
    });

    it('builds font string with quoted font family', () => {
        const value: FontPickerValue = {
            style: 'normal',
            weight: 400,
            size: 16,
            lineHeight: 1.25,
            family: '"Times New Roman", Times, serif',
        };

        const result = buildFontString(value);
        expect(result).toBe('normal 400 16px/1.25 "Times New Roman", Times, serif');
    });
});

describe('parseFontString and buildFontString roundtrip', () => {
    it('roundtrips complete font string', () => {
        const original = 'italic 600 48px/1.5 Arial, sans-serif';
        const parsed = parseFontString(original);
        const rebuilt = buildFontString(parsed);

        expect(rebuilt).toBe(original);
    });

    it('roundtrips font string with normal values', () => {
        const original = 'normal 400 16px/1.25 system-ui, sans-serif';
        const parsed = parseFontString(original);
        const rebuilt = buildFontString(parsed);

        expect(rebuilt).toBe(original);
    });

    it('roundtrips font string with bold keyword', () => {
        const original = 'bold 24px/1.25 Arial, sans-serif';
        const parsed = parseFontString(original);
        const rebuilt = buildFontString(parsed);

        // bold gets converted to 700
        expect(rebuilt).toBe('normal 700 24px/1.25 Arial, sans-serif');
    });

    it('roundtrips font string with weight number', () => {
        const original = 'oblique 700 32px/1.4 Georgia, serif';
        const parsed = parseFontString(original);
        const rebuilt = buildFontString(parsed);

        expect(rebuilt).toBe(original);
    });
});
