'use client';

import { useEffect, useRef } from 'react';

function glyphWidth(character: string): string | undefined {
    if (/\p{Number}/u.test(character)) return '0.62em';
    if (/[:：./-]/u.test(character)) return '0.32em';
    return undefined;
}

function AnimatedClockGlyph({ character }: { readonly character: string }) {
    const elementRef = useRef<HTMLSpanElement>(null);
    const previousCharacterRef = useRef(character);
    const animationRef = useRef<Animation | null>(null);

    useEffect(() => {
        if (previousCharacterRef.current === character) return;
        previousCharacterRef.current = character;
        animationRef.current?.cancel();

        const element = elementRef.current;
        const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        if (!element?.animate || reduceMotion) return;

        animationRef.current = element.animate([
            { opacity: 0.48, transform: 'translateY(18%) scale(0.92)' },
            { opacity: 1, offset: 0.62, transform: 'translateY(-11%) scale(1.06)' },
            { opacity: 1, transform: 'translateY(0) scale(1)' },
        ], {
            duration: 320,
            easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)',
        });

        return () => animationRef.current?.cancel();
    }, [character]);

    return (
        <span
            ref={elementRef}
            aria-hidden='true'
            data-clock-glyph={character}
            style={{
                display: 'inline-block',
                minWidth: glyphWidth(character),
                textAlign: 'center',
                transformOrigin: '50% 72%',
                whiteSpace: 'pre',
            }}
        >
            {character}
        </span>
    );
}

export function AnimatedClockText({ text }: { readonly text: string }) {
    return (
        <span
            aria-label={text}
            data-clock-text={text}
            style={{
                display: 'inline-flex',
                fontVariantNumeric: 'tabular-nums',
                justifyContent: 'inherit',
                whiteSpace: 'pre',
            }}
        >
            {Array.from(text, (character, index) => (
                <AnimatedClockGlyph key={index} character={character} />
            ))}
        </span>
    );
}
