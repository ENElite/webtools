import { Descriptions, Image, Modal, Space, Tag, Typography, type DescriptionsProps } from 'antd';

import type { HistoryRecord } from '../../types';

type HistoryDetailModalProps = {
    item: HistoryRecord | null;
    open: boolean;
    onClose: () => void;
    showImage?: boolean;
};

function formatSize(value: number): string {
    if (!Number.isFinite(value) || value <= 0) {
        return '--';
    }

    const megabytes = value / (1024 * 1024);
    if (megabytes >= 1) {
        return `${megabytes.toFixed(2)} MB`;
    }

    const kilobytes = value / 1024;
    return `${kilobytes.toFixed(1)} KB`;
}

function formatDateTime(value: number): string {
    // value like 1704306363
    const date = new Date(value * 1000);
    if (isNaN(date.getTime())) {
        return '--';
    }
    // yyyy-MM-dd HH:mm:ss
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function buildDescriptionItems(item: HistoryRecord): DescriptionsProps['items'] {
    return [
        { key: 'provider', label: 'Provider', children: item.providerLabel },
        {
            key: 'id',
            label: 'ID',
            children: (
                <Typography.Link href={item.sourceUrl} target='_blank' rel='noreferrer'>
                    {item.id}
                </Typography.Link>
            ),
        },
        { key: 'dimension', label: '尺寸', children: `${item.width} × ${item.height}` },
        { key: 'fileSize', label: '文件大小', children: formatSize(item.fileSize) },
        { key: 'author', label: '作者', children: item.author || '--' },
        {
            key: 'source',
            label: '来源',
            children: item.source
                ? (
                    <Typography.Link href={item.source} target='_blank' rel='noreferrer'>
                        {item.source}
                    </Typography.Link>
                )
                : '--',
        },
        { key: 'createdAt', label: '创建时间', children: formatDateTime(item.createdAt) },
        {
            key: 'tags',
            label: '标签',
            children: item.tags.length > 0
                ? (
                    <Space wrap>
                        {item.tags.map((tag) => (
                            <Tag key={tag}>{tag}</Tag>
                        ))}
                    </Space>
                )
                : '--',
        },
        {
            key: 'urls',
            label: '文件链接',
            children: (
                <>
                    <Typography.Link href={item.fileUrl} target='_blank' rel='noreferrer'>
                        原始文件
                    </Typography.Link>
                    <span className='px-8'>|</span>
                    <Typography.Link href={item.previewUrl} target='_blank' rel='noreferrer'>
                        预览图
                    </Typography.Link>
                </>
            ),
        },
    ];
}

export function HistoryDetailModal({ item, open, onClose, showImage = true }: HistoryDetailModalProps) {
    return (
        <Modal
            title={item ? `#${item.id} - ${item.providerLabel}` : '图片详情'}
            open={open}
            onCancel={onClose}
            footer={null}
            width={960}
            destroyOnHidden
        >
            {item
                ? (
                    <Space orientation='vertical' size='middle' style={{ width: '100%' }}>
                        {showImage
                            ? (
                                <Image src={item.displayUrl} alt={`detail-${item.id}`} style={{ maxHeight: 420, objectFit: 'contain' }} />
                            )
                            : null}
                        <Descriptions bordered size='small' column={1} items={buildDescriptionItems(item)} />
                    </Space>
                )
                : null}
        </Modal>
    );
}
