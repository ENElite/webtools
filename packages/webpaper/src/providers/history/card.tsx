import { Button, Space, Tag } from 'antd';

import type { HistoryRecord } from '../../types';

type ImageCardProps = {
    item: HistoryRecord;
    onDetail: () => void;
    onPreview: () => void;
    onSetCurrent: () => void;
};

export function ImageCard({ item, onDetail, onPreview, onSetCurrent }: ImageCardProps) {
    return (
        <article className='group overflow-hidden rounded-2xl border border-slate-300/30 bg-white/90 shadow-[0_18px_32px_rgba(15,23,42,0.08)] transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-[2px] hover:shadow-[0_22px_40px_rgba(15,23,42,0.12)]'>
            <div className='relative w-full overflow-hidden bg-[linear-gradient(135deg,rgba(37,99,235,0.08),rgba(20,184,166,0.12))]'>
                <img src={item.previewUrl} alt={`history-${item.id}`} className='h-full w-full object-cover' referrerPolicy='no-referrer' />
                <div className='absolute inset-0 bg-slate-900/75 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100' />
                <div className='absolute inset-0 flex flex-col p-[0.9rem] opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100'>
                    <div className='flex flex-1 items-center justify-center'>
                        <Space size={8}>
                            <Button
                                size='small'
                                type='primary'
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onDetail();
                                }}
                            >
                                详情
                            </Button>
                            <Button
                                size='small'
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onPreview();
                                }}
                            >
                                展示
                            </Button>
                            <Button
                                size='small'
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onSetCurrent();
                                }}
                            >
                                设为当前
                            </Button>
                        </Space>
                    </div>
                    <Space orientation='vertical' size={6} style={{ width: '100%' }}>
                        <Space wrap size={4}>
                            <Tag color='blue'>{item.provider}</Tag>
                            <Tag>ID {item.id}</Tag>
                        </Space>
                    </Space>
                </div>
            </div>
        </article>
    );
}
