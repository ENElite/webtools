'use client';

import { useRef, type PointerEvent, type KeyboardEvent } from 'react';
import { COLOR_LABELS, grayHex, moveColor, type StampColors } from '@/lib/stamp-qr';

export function StampColorSlider({ value, onChange }: { value: StampColors; onChange: (value: StampColors) => void }) {
    const track = useRef<HTMLDivElement>(null);
    const handles = useRef<(HTMLButtonElement | null)[]>([]);
    const active = useRef<number | null>(null);
    const percent = (v: number) => (v - 40) / 215 * 100;
    function at(clientX: number) {
        const rect = track.current!.getBoundingClientRect();
        return 40 + (clientX - rect.left) / rect.width * 215;
    }
    function start(event: PointerEvent<HTMLDivElement | HTMLButtonElement>, index?: number) {
        if (event.button !== 0) return;
        event.preventDefault(); event.stopPropagation();
        const target = at(event.clientX);
        const nearest = index ?? value.reduce((best, v, i) => Math.abs(v - target) < Math.abs(value[best] - target) ? i : best, 0);
        active.current = nearest;
        event.currentTarget.setPointerCapture(event.pointerId);
        handles.current[nearest]?.focus();
        if (index === undefined) onChange(moveColor(value, nearest, target));
    }
    function move(event: PointerEvent) {
        if (active.current !== null) onChange(moveColor(value, active.current, at(event.clientX)));
    }
    function key(event: KeyboardEvent, index: number) {
        const step = event.shiftKey ? 10 : 1;
        const next = { ArrowLeft: value[index] - step, ArrowDown: value[index] - step, ArrowRight: value[index] + step, ArrowUp: value[index] + step, Home: 40, End: 255, PageDown: value[index] - 10, PageUp: value[index] + 10 }[event.key];
        if (next === undefined) return;
        event.preventDefault(); onChange(moveColor(value, index, next));
    }
    return <div className='space-y-3' role='group' aria-label='四种有序亮度'>
        <div className='text-sm font-medium'>结构亮度</div>
        <div className='px-3 py-4'>
            <div ref={track} className='relative h-3 cursor-pointer rounded-full border border-[var(--wt-color-border)]' style={{ background: 'linear-gradient(to right, #282828, #ffffff)', touchAction: 'none' }} onPointerDown={e => start(e)} onPointerMove={move} onPointerUp={() => { active.current = null; }} onPointerCancel={() => { active.current = null; }} onLostPointerCapture={() => { active.current = null; }}>
                {value.map((v, i) => <button key={i} ref={el => { handles.current[i] = el; }} type='button' role='slider' aria-label={COLOR_LABELS[i]} aria-valuemin={i === 0 ? 40 : value[i - 1] + 1} aria-valuemax={i === 3 ? 255 : value[i + 1] - 1} aria-valuenow={v} aria-valuetext={`${v}，${grayHex(v)}`} aria-orientation='horizontal' className='absolute top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[var(--wt-color-accent)] text-[10px] font-bold shadow-sm focus:z-10 focus:outline-2 focus:outline-offset-2 focus:outline-[var(--wt-color-accent)]' style={{ left: `${percent(v)}%`, background: grayHex(v), color: v < 140 ? '#fff' : '#111', touchAction: 'none' }} onPointerDown={e => start(e, i)} onKeyDown={e => key(e, i)}>{i + 1}</button>)}
            </div>
        </div>
        <div className='grid grid-cols-2 gap-2'>
            {value.map((v, i) => <button key={i} type='button' className='flex items-center gap-2 rounded-[var(--wt-radius-md)] border border-[var(--wt-color-border)] p-2 text-left' onClick={() => handles.current[i]?.focus()}>
                <span className='h-6 w-6 shrink-0 border border-[var(--wt-color-border)]' style={{ background: grayHex(v) }} />
                <span><span className='block text-xs'>{i + 1}. {COLOR_LABELS[i]}</span><span className='block font-mono text-xs text-[var(--wt-color-text-muted)]'>{v} · {grayHex(v)}</span></span>
            </button>)}
        </div>
        <p className='text-xs text-[var(--wt-color-text-muted)]'>同一滑轨上从暗到亮排列，范围 40–255。支持拖动、方向键微调，Shift + 方向键调整 10 级。</p>
    </div>;
}
