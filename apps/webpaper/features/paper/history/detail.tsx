import { DescriptionsProps, Space, Tag, Typography } from 'antd';

import type { ProviderRecord } from '@/providers';
import { KonachanItem } from '@/providers';
import { BirdPaperItem } from '@/providers';

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

function buildKonachanDescriptionItems(item: KonachanItem): DescriptionsProps['items'] {
    return [
        { key: 'id', label: 'ID', children: item.id },
        { key: 'provider', label: '图源', children: 'Konachan' },
        { key: 'createdAt', label: '创建时间', children: formatDateTime(item.created_at) },
        {
            key: 'file_url',
            label: '文件链接',
            children: (
                <Typography.Link href={item.file_url} target='_blank' rel='noreferrer'>
                    原始文件
                </Typography.Link>
            ),
        },
        { key: 'fileSize', label: '文件大小', children: formatSize(item.file_size) },
        { key: 'dimension', label: '尺寸', children: `${item.width} × ${item.height}` },
        { key: 'rating', label: '分级', children: item.rating || '--' },
        {
            key: 'source',
            label: '来源',
            children: item.source
                ? (
                    <Typography.Link href={item.source} target='_blank' rel='noreferrer'>
                        来源链接
                    </Typography.Link>
                )
                : '--',
        },
        { key: 'author', label: '作者', children: item.author || '--' },
        {
            key: 'tags',
            label: '标签',
            span: 'filled',
            children: item.tags.length > 0
                ? (
                    <Space wrap>
                        {item.tags.split(' ').map((tag) => (
                            <Tag key={tag}>{tag}</Tag>
                        ))}
                    </Space>
                )
                : '--',
        },
    ];
}

function buildBirdPaperDescriptionItems(item: BirdPaperItem): DescriptionsProps['items'] {
    return [
        { key: 'category', label: '分类', children: item.category },
        { key: 'class_id', label: '分类 ID', children: item.class_id },
        { key: 'author', label: '作者', children: item.author || '--' },
        {
            key: 'tags',
            label: '标签',
            span: 'filled',
            children: item.tag.length > 0
                ? (
                    <Space wrap>
                        {item.tag.split(',').map((tag) => (
                            <Tag key={tag}>{tag}</Tag>
                        ))}
                    </Space>
                )
                : '--',
        },
    ];
}

export function buildDescriptionItems(item: ProviderRecord): DescriptionsProps['items'] {
    const commonItems: DescriptionsProps['items'] = [
        { key: 'id', label: 'ID', children: item.id },
        { key: 'provider', label: '图源', children: item.provider },
        {
            key: 'preview',
            label: '预览图',
            children: item.preview
                ? (
                    <img src={item.preview} alt={`preview-${item.id}`} style={{ maxWidth: 200 }} />
                )
                : '--',
        },
        {
            key: 'url',
            label: '文件链接',
            children: (
                <Typography.Link href={item.url} target='_blank' rel='noreferrer'>
                    原始文件
                </Typography.Link>
            ),
        },
    ];

    let providerItems: DescriptionsProps['items'] = [];
    switch (item.provider) {
        case 'Konachan':
            providerItems = buildKonachanDescriptionItems(item.raw) ?? [];
            break;
        case 'BirdPaper':
            providerItems = buildBirdPaperDescriptionItems(item.raw) ?? [];
            break;
        default:
            break;
    }

    return [...commonItems, ...providerItems];
}
