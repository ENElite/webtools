import { Button, Descriptions, Drawer, Empty, Image, Input, Modal, Space } from 'antd';
import { useMemo, useState } from 'react';

import { buildDescriptionItems } from './detail';
import { ImageVirtualGrid } from '@/components/imageGrid';
import type { ProviderRecord } from '@/providers';

type HistoryDrawerProps = {
    open: boolean;
    size?: 'small' | 'middle' | 'large' | number;
    items: ProviderRecord[];
    search: string;
    onSearchChange: (value: string) => void;
    onSetCurrent: (record: ProviderRecord) => void;
    onClose: () => void;
};

export function HistoryDrawer({ open, size, items, search, onSearchChange, onSetCurrent, onClose }: HistoryDrawerProps) {
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

    const openPreview = (record: ProviderRecord) => {
        const index = visibleItems.findIndex((item) => String(item.id) === String(record.id));
        if (index < 0) {
            return;
        }

        setPreviewIndex(index);
        setPreviewVisible(true);
    };

    const renderHistoryTile = (record: ProviderRecord) => {
        return (
            <article
                className='group relative h-full w-full overflow-hidden bg-slate-950'
                onClick={() => openPreview(record)}
            >
                <img
                    src={record.preview || record.url}
                    alt={`history-${record.id}`}
                    className='h-full w-full object-cover'
                    referrerPolicy='no-referrer'
                />
                <div className='absolute inset-0 bg-slate-950/0 transition-colors duration-200 group-hover:bg-slate-950/68' />
                <div className='absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100'>
                    <Space size={8} wrap>
                        <Button
                            size='small'
                            type='primary'
                            aria-label='详情'
                            onClick={(event) => {
                                event.stopPropagation();
                                setSelected(record);
                            }}
                        >
                            <span className='icon-[octicon--info-16]' />
                        </Button>
                        <Button
                            size='small'
                            aria-label='打开'
                            onClick={(event) => {
                                event.stopPropagation();
                                openPreview(record);
                            }}
                        >
                            打开
                        </Button>
                        <Button
                            size='small'
                            aria-label='设为当前'
                            onClick={(event) => {
                                event.stopPropagation();
                                onSetCurrent(record);
                            }}
                        >
                            设为当前
                        </Button>
                    </Space>
                </div>
            </article>
        );
    };

    return (
        <Drawer
            title={`历史记录 (${visibleItems.length})`}
            size={size}
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
                        <div style={{ height: '60vh' }}>
                            <ImageVirtualGrid
                                items={visibleItems.map((it) => ({
                                    src: it.preview || it.url || '',
                                    alt: String(it.id),
                                    title: `${it.provider}-${it.id}`,
                                    key: String(it.id),
                                }))}
                                layoutMode='featured'
                                aspectRatio={16 / 9}
                                gap={0}
                                overscan={1}
                                renderItem={({ index }) => {
                                    const record = visibleItems[index];
                                    return record ? renderHistoryTile(record) : null;
                                }}
                            />
                        </div>
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
                            key={String(item.id)}
                            src={item.preview || item.url}
                            alt={`preview-${item.id}`}
                        />
                    ))}
                </Image.PreviewGroup>
            </div>

            <Modal
                title={selected ? `#${selected.id} - ${selected.provider}` : ''}
                open={Boolean(selected)}
                onCancel={() => setSelected(null)}
                footer={null}
                width={960}
                destroyOnHidden
                closable
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
