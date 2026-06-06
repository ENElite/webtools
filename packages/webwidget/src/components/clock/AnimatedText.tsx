import { useRef, useMemo } from 'react';
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
    text: string,
    prevText: string | null,
    duration: number,
    style?: CSSProperties,
    animated?: boolean,
): ReactElement {
    const chars = Array.from(text);
    const prevChars = prevText !== null ? Array.from(prevText) : null;

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

    const prevText = useMemo(() => {
        const prev = prevTextRef.current;
        prevTextRef.current = text;
        return prev;
    }, [text]);

    return renderChars(text, prevText, duration, style, animated);
}
