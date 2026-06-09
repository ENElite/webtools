import { useRef, useMemo, useEffect } from 'react';
import type { CSSProperties, ReactElement } from 'react';

import { AnimatedChar } from './AnimatedChar';

interface AnimatedTextProps {
    text: string;
    style?: CSSProperties;
    animated?: boolean;
    duration?: number;
}

/**
 * Render text as a flex row of characters.
 * Always uses the same flex container structure regardless of animation,
 * so toggling animation on/off doesn't cause layout shifts.
 */
function renderChars(
    chars: string[],
    prevChars: string[] | null,
    duration: number,
    style?: CSSProperties,
    animated?: boolean,
): ReactElement {
    return (
        <div style={{ display: 'flex' }}>
            {chars.map((char, i) => {
                if (!animated) {
                    return (
                        <span key={i} style={style}>
                            {char}
                        </span>
                    );
                }

                const changed = prevChars !== null && prevChars[i] !== char;

                return (
                    <AnimatedChar
                        key={i}
                        char={char}
                        style={style}
                        duration={changed ? duration : 0}
                    />
                );
            })}
        </div>
    );
}

export function AnimatedText({ text, style, animated = false, duration = 0.3 }: AnimatedTextProps) {
    const prevTextRef = useRef<string | null>(null);
    const prevAnimatedRef = useRef(animated);

    const prevText = useMemo(() => {
        const prev = prevTextRef.current;
        prevTextRef.current = text;
        return prev;
    }, [text]);

    // Track animated transitions. When animation is first enabled,
    // mark justEnabled so we can use null prevChars on this render.
    const justEnabled = animated && !prevAnimatedRef.current;

    useEffect(() => {
        if (animated && !prevAnimatedRef.current) {
            // Sync prevTextRef so next text change compares correctly
            prevTextRef.current = text;
        }
        prevAnimatedRef.current = animated;
    }, [animated, text]);

    // On the first render after enabling animation, use null prevChars
    // so no characters are treated as "changed" and no animation fires.
    const chars = Array.from(text);
    const prevChars = justEnabled
        ? null
        : prevText !== null
            ? Array.from(prevText)
            : null;

    return renderChars(chars, prevChars, duration, style, animated);
}
