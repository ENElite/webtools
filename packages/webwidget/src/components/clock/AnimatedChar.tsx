import type { CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface AnimatedCharProps {
    char: string;
    style?: CSSProperties;
    duration?: number;
}

/**
 * Parse stroke width from WebkitTextStroke CSS string (e.g. "2px black" → 2).
 */
function parseStrokeWidth(value: CSSProperties['WebkitTextStroke']): number {
    if (typeof value !== 'string') return 0;
    const match = (value as string).match(/^([\d.]+)px/);
    return match?.[1] ? parseFloat(match[1]) : 0;
}

/**
 * Get line-height from style as a number.
 * Checks explicit lineHeight first, falls back to defaultLineHeight.
 */
function getLineHeight(style: CSSProperties | undefined, defaultLineHeight: number): number {
    if (style?.lineHeight != null) {
        const lh = typeof style.lineHeight === 'number'
            ? style.lineHeight
            : parseFloat(style.lineHeight as string);
        if (!Number.isNaN(lh)) return lh;
    }
    return defaultLineHeight;
}

/**
 * Animated single character using framer-motion.
 *
 * Uses -webkit-text-stroke for crisp outline rendering.
 * Container adds padding on all four sides so the stroke is never clipped.
 * Container height respects the line-height from the font prop.
 */
export function AnimatedChar({ char, style, duration = 0.3 }: AnimatedCharProps) {
    const transition = { duration, ease: 'easeOut' as const };

    // Parse stroke width and line-height from style
    const strokeW = parseStrokeWidth(style?.WebkitTextStroke);
    const pad = Math.ceil(strokeW / 2);
    const lh = getLineHeight(style, 1.1);

    // Strip stroke from spacer — spacer only measures text width
    const spacerStyle = pad > 0
        ? { ...style, WebkitTextStroke: undefined as CSSProperties['WebkitTextStroke'] }
        : style;

    return (
        <div
            style={{
                position: 'relative',
                display: 'inline-block',
                overflow: 'hidden',
                height: `${lh}em`,
                padding: `${pad}px`,
                verticalAlign: 'top',
            }}
        >
            {/* Hidden spacer — establishes container width from text + padding */}
            <span
                style={{
                    ...spacerStyle,
                    visibility: 'hidden',
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: '100%',
                }}
            >
                {char}
            </span>

            {/* Animated layer — positioned inside the padded area */}
            <div
                style={{
                    position: 'absolute',
                    left: pad,
                    top: pad,
                    width: `calc(100% - ${pad * 2}px)`,
                    height: `calc(100% - ${pad * 2}px)`,
                }}
            >
                <AnimatePresence mode="popLayout">
                    <motion.span
                        key={char}
                        style={{
                            ...style,
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '-100%', opacity: 0 }}
                        transition={transition}
                    >
                        {char}
                    </motion.span>
                </AnimatePresence>
            </div>
        </div>
    );
}
