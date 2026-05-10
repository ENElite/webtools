import {
    Drawer,
    Empty,
    Image,
    Input,
    Space,
    Masonry,
    Modal,
    Descriptions,
} from 'antd';

import { useMemo, useState } from 'react';


import { buildDescriptionItems } from './detail';
import { ImageCard } from './card';
import { ProviderRecord } from '@/providers';

type HistoryDrawerProps = {
    open: boolean;
    items: ProviderRecord[];
    search: string;
    onSearchChange: (value: string) => void;
    onSetCurrent: (record: ProviderRecord) => void;
    onClose: () => void;
};


export function HistoryDrawer({ open, items, search, onSearchChange, onSetCurrent, onClose }: HistoryDrawerProps) {
    const [selected, setSelected] = useState<ProviderRecord | null>(null);
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
                    String(item.provider).toLowerCase().includes(keyword) ||
                    String(item.id).includes(keyword)
                );
            });
    }, [items, search]);

    const masonryItems = useMemo(() => {
        return visibleItems.map((item) => ({
            key: `${item.provider}-${item.id}}`,
            data: item,
            height: 240 + 128,
        }));
    }, [visibleItems]);

    const openPreview = (record: ProviderRecord) => {
        const targetKey = `${record.provider}-${record.id}`;
        const index = visibleItems.findIndex((item) => `${item.provider}-${item.id}` === targetKey);
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
                                    item={item.data as ProviderRecord}
                                    onDetail={() => setSelected(item.data as ProviderRecord)}
                                    onPreview={() => openPreview(item.data as ProviderRecord)}
                                    onSetCurrent={() => onSetCurrent(item.data as ProviderRecord)}
                                />
                            )}
                            fresh
                        />
                    )}
            </Space>

            <div className='hidden'>
                <Image.PreviewGroup
                    preview={{
                        open: previewVisible,
                        current: previewIndex,
                        onOpenChange: (visible) => setPreviewVisible(visible),
                        onChange: (current) => setPreviewIndex(current),
                    }}
                >
                    {visibleItems.map((item) => (
                        <Image
                            key={`${item.provider}-${item.id}`}
                            src={item.preview || item.url}
                            alt={`preview-${item.id}`}
                        />
                    ))}
                </Image.PreviewGroup>
            </div>

            <Modal
                title={selected?.provider}
                open={Boolean(selected)}
                onCancel={() => setSelected(null)}
                footer={null}
            >
                {selected && (
                    <Space orientation='vertical' size='middle' style={{ width: '100%' }}>
                        <Descriptions bordered size='small' items={buildDescriptionItems(selected)} />
                    </Space>
                )}
            </Modal>
        </Drawer>
    );
}
