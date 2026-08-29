'use client';

import { Drawer, TextInput } from '@webtools/ui';
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

    return (
        <Drawer
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) onClose();
            }}
            title={`历史记录（${visibleItems.length}）`}
            description='找回刚刚看过的壁纸和视频。'
            size='lg'
            className='wp-history-drawer'
        >
            <label className='wp-history-search'>
                <span className='sr-only'>搜索历史记录</span>
                <TextInput
                    type='search'
                    value={search}
                    placeholder='搜索来源、ID 或媒体类型'
                    aria-label='搜索历史记录'
                    onChange={(event) => onSearchChange(event.currentTarget.value)}
                />
            </label>

            {visibleItems.length === 0 ? (
                <div className='wp-history-empty'>
                    <span aria-hidden='true'>☁</span>
                    <p>还没有历史记录</p>
                    <small>浏览过的壁纸会安静地待在这里</small>
                </div>
            ) : (
                <ul className='wp-history-grid'>
                    {visibleItems.map(({ item, historyIndex }) => (
                        <li key={`${item.sourceId}:${item.id}:${historyIndex}`}>
                            <button
                                type='button'
                                onClick={() => onSelect(item, historyIndex)}
                                className='wp-history-card'
                                aria-label={`查看 ${item.sourceId} ${item.id}`}
                            >
                                {thumbnailUrl(item) ? (
                                    <img
                                        src={thumbnailUrl(item)}
                                        alt=''
                                        referrerPolicy='no-referrer'
                                    />
                                ) : (
                                    <span className='wp-history-video'>▶ 视频</span>
                                )}
                                <span className='wp-history-meta'>
                                    {item.sourceId} · {item.kind} · {item.id}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Drawer>
    );
}

function thumbnailUrl(item: MediaItem): string | undefined {
    return item.kind === 'image' ? (item.previewUrl ?? item.url) : item.posterUrl;
}

function historySearchText(item: MediaItem): string {
    return `${item.sourceId} ${item.kind} ${item.id}`.toLocaleLowerCase();
}
