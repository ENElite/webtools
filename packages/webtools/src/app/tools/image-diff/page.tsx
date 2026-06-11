'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button, Tabs } from '@heroui/react';
import { ToolLayout } from '@/components/ToolLayout';
import { ImageViewer } from '@/components/ImageViewer';
import { diffImages, loadImageData, imageDataToBlobUrl } from '@/lib/image-diff';

// ─── 文件拖放区域 ──────────────────────────────────────────────

interface DropZoneProps {
    label: string;
    file: File | null;
    url: string | null;
    onFile: (file: File) => void;
    onClear: () => void;
}

function DropZone({ label, file, url, onFile, onClear }: DropZoneProps) {
    const [isDragActive, setIsDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback((f: File) => {
        if (!f.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }
        onFile(f);
    }, [onFile]);

    const onDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
    }, []);

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        if (e.dataTransfer.files?.[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, [handleFile]);

    const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            handleFile(e.target.files[0]);
        }
    }, [handleFile]);

    if (url) {
        return (
            <div className='relative rounded-lg overflow-hidden border border-gray-200 group'>
                <img src={url} alt={label} className='w-full h-48 object-contain bg-gray-50' />
                <div className='absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center'>
                    <Button
                        size='sm'
                        variant='tertiary'
                        className='opacity-0 group-hover:opacity-100 transition-opacity bg-white/90'
                        onPress={onClear}
                    >
                        重新选择
                    </Button>
                </div>
                <div className='absolute bottom-2 left-2 bg-white/80 backdrop-blur-sm rounded px-2 py-0.5 text-xs'>
                    {file?.name}
                </div>
            </div>
        );
    }

    return (
        <div
            className={`border-2 border-dashed rounded-lg h-48 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'
            }`}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
        >
            <input
                ref={fileInputRef}
                type='file'
                accept='image/*'
                className='hidden'
                onChange={onInputChange}
            />
            <div className='text-3xl mb-2'>📷</div>
            <p className='text-sm font-medium'>
                {isDragActive ? '释放鼠标' : `拖放或点击选择${label}`}
            </p>
            <p className='text-xs text-gray-400 mt-1'>支持 PNG, JPG, GIF, WebP</p>
        </div>
    );
}

// ─── 分割视图 ──────────────────────────────────────────────

interface SplitViewProps {
    img1: string;
    img2: string;
}

function SplitView({ img1, img2 }: SplitViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [splitX, setSplitX] = useState(50); // 百分比
    const [dragging, setDragging] = useState<'line' | 'start' | 'end' | null>(null);
    const [startY, setStartY] = useState(0); // 顶部锚点 y%
    const [endY, setEndY] = useState(100); // 底部锚点 y%
    const dragRef = useRef({ startX: 0, startSplitX: 0, startStartY: 0, startEndY: 0 });

    const handlePointerDown = useCallback((e: React.PointerEvent, type: 'line' | 'start' | 'end') => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(type);
        dragRef.current = {
            startX: e.clientX,
            startSplitX: splitX,
            startStartY: startY,
            startEndY: endY,
        };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, [splitX, startY, endY]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!dragging || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const dx = e.clientX - dragRef.current.startX;
        const dxPercent = (dx / rect.width) * 100;

        if (dragging === 'line') {
            const newY = dragRef.current.startSplitX + dxPercent;
            setSplitX(Math.max(0, Math.min(100, newY)));
        } else if (dragging === 'start') {
            const dy = e.clientY - (rect.top + (dragRef.current.startStartY / 100) * rect.height);
            const dyPercent = (dy / rect.height) * 100;
            const newY = Math.max(0, Math.min(endY - 2, dragRef.current.startStartY + dyPercent));
            setStartY(newY);
        } else if (dragging === 'end') {
            const dy = e.clientY - (rect.top + (dragRef.current.startEndY / 100) * rect.height);
            const dyPercent = (dy / rect.height) * 100;
            const newY = Math.max(startY + 2, Math.min(100, dragRef.current.startEndY + dyPercent));
            setEndY(newY);
        }
    }, [dragging, startY, endY]);

    const handlePointerUp = useCallback(() => {
        setDragging(null);
    }, []);

    // 分割线两端的像素坐标
    const lineTopY = `${startY}%`;
    const lineBottomY = `${endY}%`;

    // 左侧 clip-path：从容器顶部到 startY，然后沿分割线到 endY，再到底部
    const leftClip = `polygon(0 0, ${splitX}% ${startY}, ${splitX}% ${endY}, 0 100%)`;

    return (
        <div
            ref={containerRef}
            className='relative w-full min-h-[400px] rounded-lg overflow-hidden border border-gray-200 bg-gray-50 select-none'
            style={{ cursor: dragging === 'line' ? 'col-resize' : dragging ? 'ns-resize' : 'default' }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            {/* 图片2（底层，完整显示，提供容器高度） */}
            <img src={img2} alt='图片2' className='w-full h-auto block' draggable={false} />

            {/* 图片1（上层，用 clip-path 裁剪） */}
            <img
                src={img1}
                alt='图片1'
                className='absolute inset-0 w-full h-auto block'
                style={{ clipPath: leftClip, maxWidth: 'none', maxHeight: 'none' }}
                draggable={false}
            />

            {/* 分割线 */}
            <div
                className='absolute top-0 bottom-0 w-0.5 bg-white shadow-md z-10'
                style={{
                    left: `${splitX}%`,
                    top: lineTopY,
                    bottom: `${100 - endY}%`,
                    cursor: 'col-resize',
                }}
                onPointerDown={(e) => handlePointerDown(e, 'line')}
            >
              {/* 线身上的拖拽手柄 */}
              <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-500 text-xs pointer-events-none'>
                  ⇔
              </div>
            </div>

            {/* 起点控制点 */}
            <div
                className='absolute w-4 h-4 rounded-full bg-white border-2 border-blue-500 shadow z-20 -translate-x-1/2 -translate-y-1/2'
                style={{ left: `${splitX}%`, top: lineTopY, cursor: 'ns-resize' }}
                onPointerDown={(e) => handlePointerDown(e, 'start')}
            />

            {/* 终点控制点 */}
            <div
                className='absolute w-4 h-4 rounded-full bg-white border-2 border-blue-500 shadow z-20 -translate-x-1/2 -translate-y-1/2'
                style={{ left: `${splitX}%`, top: lineBottomY, cursor: 'ns-resize' }}
                onPointerDown={(e) => handlePointerDown(e, 'end')}
            />

            {/* 标签 */}
            <div className='absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded z-20 pointer-events-none'>
                图片 1
            </div>
            <div className='absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded z-20 pointer-events-none'>
                图片 2
            </div>
        </div>
    );
}

// ─── 切换视图 ──────────────────────────────────────────────

interface ToggleViewProps {
    img1: string;
    img2: string;
}

function ToggleView({ img1, img2 }: ToggleViewProps) {
    const [showSecond, setShowSecond] = useState(false);

    return (
        <div className='relative min-h-[400px] rounded-lg overflow-hidden border border-gray-200 bg-gray-50 select-none'>
            {/* 图片1（底层） */}
            <img src={img1} alt='图片1' className='w-full h-auto block' draggable={false} />

            {/* 图片2（覆盖层，按下时显示） */}
            {showSecond && (
                <img
                    src={img2}
                    alt='图片2'
                    className='absolute inset-0 w-full h-auto block'
                    style={{ maxWidth: 'none', maxHeight: 'none' }}
                    draggable={false}
                />
            )}

            {/* 透明遮罩用于捕获鼠标事件 */}
            <div
                className='absolute inset-0 z-10'
                onPointerDown={() => setShowSecond(true)}
                onPointerUp={() => setShowSecond(false)}
                onPointerLeave={() => setShowSecond(false)}
                onContextMenu={(e) => e.preventDefault()}
                style={{ cursor: 'pointer' }}
            />

            {/* 状态提示 */}
            <div className='absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full z-20 pointer-events-none'>
                {showSecond ? '松开查看图片 1' : '按下查看图片 2'}
            </div>

            {/* 标签 */}
            <div className='absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded z-20 pointer-events-none'>
                {showSecond ? '图片 2' : '图片 1'}
            </div>
        </div>
    );
}

// ─── 主页面 ──────────────────────────────────────────────

export default function ImageDiffPage() {
    const [file1, setFile1] = useState<File | null>(null);
    const [file2, setFile2] = useState<File | null>(null);
    const [url1, setUrl1] = useState<string | null>(null);
    const [url2, setUrl2] = useState<string | null>(null);
    const [diffUrl, setDiffUrl] = useState<string | null>(null);
    const [isComputing, setIsComputing] = useState(false);

    // 清理 object URLs
    useEffect(() => {
        return () => {
            if (url1) URL.revokeObjectURL(url1);
            if (url2) URL.revokeObjectURL(url2);
            if (diffUrl) URL.revokeObjectURL(diffUrl);
        };
    }, [url1, url2, diffUrl]);

    const handleFile1 = useCallback((f: File) => {
        if (url1) URL.revokeObjectURL(url1);
        if (diffUrl) URL.revokeObjectURL(diffUrl);
        setDiffUrl(null);
        setFile1(f);
        setUrl1(URL.createObjectURL(f));
    }, [url1, diffUrl]);

    const handleFile2 = useCallback((f: File) => {
        if (url2) URL.revokeObjectURL(url2);
        if (diffUrl) URL.revokeObjectURL(diffUrl);
        setDiffUrl(null);
        setFile2(f);
        setUrl2(URL.createObjectURL(f));
    }, [url2, diffUrl]);

    const clearFile1 = useCallback(() => {
        if (url1) URL.revokeObjectURL(url1);
        if (diffUrl) URL.revokeObjectURL(diffUrl);
        setFile1(null);
        setUrl1(null);
        setDiffUrl(null);
    }, [url1, diffUrl]);

    const clearFile2 = useCallback(() => {
        if (url2) URL.revokeObjectURL(url2);
        if (diffUrl) URL.revokeObjectURL(diffUrl);
        setFile2(null);
        setUrl2(null);
        setDiffUrl(null);
    }, [url2, diffUrl]);

    // 两张图都选好后自动计算 diff
    useEffect(() => {
        if (!url1 || !url2) return;

        let cancelled = false;
        setIsComputing(true);

        (async () => {
            try {
                const [data1, data2] = await Promise.all([
                    loadImageData(url1),
                    loadImageData(url2),
                ]);
                const diffData = diffImages(data1, data2);
                const blobUrl = await imageDataToBlobUrl(diffData);
                if (!cancelled) {
                    setDiffUrl(blobUrl);
                } else {
                    URL.revokeObjectURL(blobUrl);
                }
            } catch (err) {
                console.error('计算差异失败:', err);
            } finally {
                if (!cancelled) setIsComputing(false);
            }
        })();

        return () => { cancelled = true; };
    }, [url1, url2]);

    const bothLoaded = url1 && url2;

    return (
        <ToolLayout
            title='图片对比'
            description='逐像素对比两张图片的差异，支持差异视图、分割视图和切换视图'
        >
            <div className='max-w-6xl mx-auto'>
                {!bothLoaded ? (
                    /* 选择图片阶段 */
                    <div className='grid grid-cols-2 gap-4'>
                        <div>
                            <h3 className='text-sm font-medium text-gray-500 mb-2'>图片 1</h3>
                            <DropZone
                                label='图片 1'
                                file={file1}
                                url={url1}
                                onFile={handleFile1}
                                onClear={clearFile1}
                            />
                        </div>
                        <div>
                            <h3 className='text-sm font-medium text-gray-500 mb-2'>图片 2</h3>
                            <DropZone
                                label='图片 2'
                                file={file2}
                                url={url2}
                                onFile={handleFile2}
                                onClear={clearFile2}
                            />
                        </div>
                    </div>
                ) : (
                    /* 对比视图阶段 */
                    <div>
                        <Tabs>
                            <Tabs.ListContainer>
                                <Tabs.List aria-label='对比视图'>
                                    <Tabs.Tab id='diff'>
                                        🔍 差异视图
                                        <Tabs.Indicator />
                                    </Tabs.Tab>
                                    <Tabs.Tab id='split'>
                                        ✂️ 分割视图
                                        <Tabs.Indicator />
                                    </Tabs.Tab>
                                    <Tabs.Tab id='toggle'>
                                        🔄 切换视图
                                        <Tabs.Indicator />
                                    </Tabs.Tab>
                                </Tabs.List>
                            </Tabs.ListContainer>
                            <Tabs.Panel id='diff'>
                                <div className='mt-2'>
                                    {isComputing ? (
                                        <div className='flex items-center justify-center h-[500px] bg-gray-50 rounded-lg border border-gray-200'>
                                            <div className='text-center'>
                                                <div className='text-4xl mb-2 animate-spin'>⏳</div>
                                                <p className='text-gray-500'>计算像素差异中...</p>
                                            </div>
                                        </div>
                                    ) : diffUrl ? (
                                        <ImageViewer
                                            src={diffUrl}
                                            alt='差异图'
                                            className='h-[500px]'
                                        />
                                    ) : null}
                                </div>
                            </Tabs.Panel>
                            <Tabs.Panel id='split'>
                                <div className='mt-2'>
                                    <SplitView img1={url1} img2={url2} />
                                </div>
                            </Tabs.Panel>
                            <Tabs.Panel id='toggle'>
                                <div className='mt-2'>
                                    <ToggleView img1={url1} img2={url2} />
                                </div>
                            </Tabs.Panel>
                        </Tabs>

                        {/* 底部操作栏 */}
                        <div className='flex items-center justify-center gap-3 mt-4'>
                            <Button variant='tertiary' onPress={() => { clearFile1(); clearFile2(); }}>
                                重新选择图片
                            </Button>
                            {diffUrl && (
                                <Button
                                    variant='primary'
                                    onPress={() => {
                                        const link = document.createElement('a');
                                        link.href = diffUrl;
                                        link.download = 'diff-result.png';
                                        link.click();
                                    }}
                                >
                                    下载差异图
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </ToolLayout>
    );
}
