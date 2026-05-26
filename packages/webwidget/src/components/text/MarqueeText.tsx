import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

type MarqueeTextProps = {
    children: ReactNode;
    speed?: number;
    direction?: 'left' | 'right';
    gap?: number;
    style?: CSSProperties;
};

export function MarqueeText({
    children,
    speed = 30,
    direction = 'left',
    gap = 50,
    style,
}: MarqueeTextProps) {
    const [offset, setOffset] = useState(() => -Infinity);
    const offsetRef = useRef(-Infinity);
    const directionRef = useRef(direction);
    const lastTimeRef = useRef<number | null>(null);
    const loopRef = useRef(gap);
    const firstChildRef = useRef<HTMLSpanElement>(null);
    const initializedRef = useRef(false);

    directionRef.current = direction;

    useEffect(() => {
        if (!firstChildRef.current) return;
        const w = firstChildRef.current.offsetWidth;
        if (w <= 0) return;
        loopRef.current = w + gap;
        if (!initializedRef.current) {
            const init = direction === 'left' ? -w : w;
            offsetRef.current = init;
            setOffset(init);
            initializedRef.current = true;
        }
    });

    useEffect(() => {
        let raf: number;

        const tick = (time: number) => {
            if (lastTimeRef.current === null) {
                lastTimeRef.current = time;
            }

            const dt = (time - lastTimeRef.current) / 1000;
            lastTimeRef.current = time;

            const loop = loopRef.current;
            const dir = directionRef.current;
            offsetRef.current += (dir === 'left' ? -1 : 1) * speed * dt;

            if (offsetRef.current <= -loop) {
                offsetRef.current += loop;
            } else if (offsetRef.current >= loop) {
                offsetRef.current -= loop;
            }

            setOffset(offsetRef.current);
            raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [speed, gap]);

    return (
        <div
            style={{
                overflow: 'hidden',
                width: '100%',
                height: '100%',
                ...style,
            }}
        >
            <div
                style={{
                    display: 'inline-flex',
                    whiteSpace: 'pre',
                    gap: `${gap}px`,
                    transform: `translateX(${offset}px)`,
                }}
            >
                <span ref={firstChildRef} style={{ paddingRight: `${gap}px` }}>{children}</span>
                <span style={{ paddingRight: `${gap}px` }}>{children}</span>
            </div>
        </div>
    );
}
