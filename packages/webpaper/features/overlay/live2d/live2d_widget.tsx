'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useElementSize, useDebounce } from '@reactuses/core';
import { useLive2D } from './useLive2D';
import { useLive2DModel } from './useLive2DModel';
import type { WidgetRendererProps } from '../types';
import type { Live2dWidgetProps } from './schema';

export function Live2dWidget(props: WidgetRendererProps<Live2dWidgetProps>) {
    const { widget } = props;
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [elemWidth, elemHeight] = useElementSize(containerRef.current);
    const debouncedSize = useDebounce({ width: elemWidth, height: elemHeight }, widget.props.resizeDelay ?? 300);

    const onHit = useCallback((areas: string[]) => {
        void areas;
    }, []);

    const { l2d, canvas, resize } = useLive2D({
        renderPrecision: widget.props.renderPrecision,
    });

    useLive2DModel({
        l2d,
        modelPath: widget.props.modelPath,
        scale: widget.props.scale,
        onHit: widget.props.interaction ? onHit : undefined,
    });

    useEffect(() => {
        resize(debouncedSize.width, debouncedSize.height);
    }, [debouncedSize.width, debouncedSize.height, resize]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !canvas) return;
        const c = canvas;
        if (!c) return;
        if (!container.contains(c)) {
            container.appendChild(c);
            c.style.display = 'block';
            c.style.height = '100%';
        }
        return () => {
            try {
                if (c && container.contains(c)) {
                    container.removeChild(c);
                }
            } catch (e) {
                // ignore
            }
        };
    }, [canvas]);

    const containerStyle: CSSProperties = {
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        minHeight: 0,
    };

    return (
        <>
            <div ref={containerRef} style={containerStyle} />
        </>
    );
}
