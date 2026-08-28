'use client';

import { useMemo } from 'react';

import type { MediaItem } from '../../domain';

export interface HistoryDrawerProps {
    readonly open: boolean;
    readonly items: readonly MediaItem[];
    readonly search: string;
    readonly onSearchChange: (value: string) => void;
    readonly onSelect: (item: MediaItem, historyIndex: number) => void;
    readonly onClose: () => void;
}

export function HistoryDrawer({
    open,
    items,
    search,
    onSearchChange,
    onSelect,
    onClose,
}: HistoryDrawerProps) {
    const visibleItems = useMemo(() => {
        const keyword = search.trim().toLocaleLowerCase();
        return items
            .map((item, historyIndex) => ({ item, historyIndex }))
            .reverse()
            .filter(({ item }) => !keyword || historySearchText(item).includes(keyword));
    }, [items, search]);

    if (!open) return null;

    return (
        <aside
            role='dialog'
            aria-modal='true'
            aria-labelledby='media-history-title'
            className='fixed inset-y-0 right-0 z-50 flex w-[min(42rem,100vw)] flex-col bg-white shadow-2xl'
        >
            <header className='flex items-center justify-between border-b px-4 py-3'>
                <h2 id='media-history-title'>历史记录（{visibleItems.length}）</h2>
                <button type='button' aria-label='关闭历史记录' onClick={onClose}>关闭</button>
            </header>

            <label className='border-b p-4'>
                <span className='sr-only'>搜索历史记录</span>
                <input
                    type='search'
                    value={search}
                    placeholder='搜索来源、ID 或媒体类型'
                    aria-label='搜索历史记录'
                    onChange={(event) => onSearchChange(event.currentTarget.value)}
                    className='w-full rounded border px-3 py-2'
                />
            </label>

            {visibleItems.length === 0 ? (
                <p className='grid flex-1 place-items-center text-slate-500'>没有历史记录</p>
            ) : (
                <ul className='grid grid-cols-2 gap-2 overflow-y-auto p-2 sm:grid-cols-3'>
                    {visibleItems.map(({ item, historyIndex }) => (
                        <li key={`${item.sourceId}:${item.id}:${historyIndex}`}>
                            <button
                                type='button'
                                onClick={() => onSelect(item, historyIndex)}
                                className='group relative block aspect-video w-full overflow-hidden bg-slate-950 text-left text-white'
                                aria-label={`查看 ${item.sourceId} ${item.id}`}
                            >
                                {thumbnailUrl(item) ? (
                                    <img
                                        src={thumbnailUrl(item)}
                                        alt=''
                                        className='h-full w-full object-cover opacity-85 transition-opacity group-hover:opacity-55'
                                        referrerPolicy='no-referrer'
                                    />
                                ) : (
                                    <span className='grid h-full place-items-center'>视频</span>
                                )}
                                <span className='absolute inset-x-0 bottom-0 bg-slate-950/75 px-2 py-1 text-xs'>
                                    {item.sourceId} · {item.kind} · {item.id}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </aside>
    );
}

function thumbnailUrl(item: MediaItem): string | undefined {
    return item.kind === 'image' ? (item.previewUrl ?? item.url) : item.posterUrl;
}

function historySearchText(item: MediaItem): string {
    return `${item.sourceId} ${item.kind} ${item.id}`.toLocaleLowerCase();
}
