import {
    Drawer,
    Empty,
    Image,
    Input,
    Space,
    Masonry,
} from 'antd';

import { useMemo, useState } from 'react';

import type { HistoryRecord } from '../../types';
import { HistoryDetailModal } from './detail';
import { ImageCard } from './card';

type HistoryDrawerProps = {
    open: boolean;
    items: HistoryRecord[];
    search: string;
    onSearchChange: (value: string) => void;
    onSetCurrent: (record: HistoryRecord) => void;
    onClose: () => void;
};

export function HistoryDrawer({ open, items, search, onSearchChange, onSetCurrent, onClose }: HistoryDrawerProps) {
    const [selected, setSelected] = useState<HistoryRecord | null>(null);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewIndex, setPreviewIndex] = useState(0);

    const visibleItems = useMemo(() => {
        if (!search.trim()) {
            return [...items].reverse();
        }

        const keyword = search.trim().toLowerCase();
        return [...items]
            .reverse()
            .filter((item) => {
                return (
                    item.tags.join(' ').toLowerCase().includes(keyword) ||
                    (item.providerLabel ?? item.provider).toLowerCase().includes(keyword) ||
                    String(item.id).includes(keyword)
                );
            });
    }, [items, search]);

    const masonryItems = useMemo(() => {
        return visibleItems.map((item) => ({
            key: `${item.providerId}-${item.id}-${item.sequence}`,
            data: item,
            height: Math.max(220, Math.round((item.height / Math.max(item.width, 1)) * 240) + 128),
        }));
    }, [visibleItems]);

    const openPreview = (record: HistoryRecord) => {
        const index = visibleItems.findIndex((item) => item.sequence === record.sequence);
        if (index < 0) {
            return;
        }

        setPreviewIndex(index);
        setPreviewVisible(true);
    };

    return (
        <Drawer
            title={`历史记录 (${visibleItems.length})`}
            size={980}
            placement='right'
            onClose={onClose}
            open={open}
            destroyOnHidden
        >
            <Space orientation='vertical' style={{ width: '100%' }} size='middle'>
                <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder='搜索 tag / ID / provider' />

                {visibleItems.length === 0
                    ? (
                        <Empty description='没有历史记录' />
                    )
                    : (
                        <Masonry
                            columns={{ xs: 2, sm: 3, md: 4, lg: 5 }}
                            gutter={{ xs: 6, sm: 8, md: 12 }}
                            items={masonryItems}
                            itemRender={(item) => (
                                <ImageCard
                                    item={item.data as HistoryRecord}
                                    onDetail={() => setSelected(item.data as HistoryRecord)}
                                    onPreview={() => openPreview(item.data as HistoryRecord)}
                                    onSetCurrent={() => onSetCurrent(item.data as HistoryRecord)}
                                />
                            )}
                            fresh
                        />
                    )}
            </Space>

            <div className='hidden'>
                <Image.PreviewGroup
                    preview={{
                        visible: previewVisible,
                        current: previewIndex,
                        onVisibleChange: (visible) => setPreviewVisible(visible),
                        onChange: (current) => setPreviewIndex(current),
                    }}
                >
                    {visibleItems.map((item) => (
                        <Image
                            key={`${item.providerId}-${item.id}-${item.sequence}`}
                            src={item.displayUrl || item.previewUrl}
                            alt={`preview-${item.id}`}
                        />
                    ))}
                </Image.PreviewGroup>
            </div>

            <HistoryDetailModal
                item={selected}
                open={Boolean(selected)}
                onClose={() => setSelected(null)}
                showImage
            />
        </Drawer>
    );
}
