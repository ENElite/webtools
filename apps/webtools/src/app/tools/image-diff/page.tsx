'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button, Tooltip } from '@heroui/react';
import { ToolLayout } from '@/components/ToolLayout';
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

// ─── 悬浮按钮 ──────────────────────────────────────────────

interface FloatingButtonProps {
    label: string;
    icon: string;
    isActive?: boolean;
    onClick: () => void;
}

function FloatingButton({ label, icon, isActive, onClick }: FloatingButtonProps) {
    return (
        <Tooltip delay={300}>
            <Tooltip.Trigger>
                <Button
                    size='sm'
                    isIconOnly
                    variant={isActive ? 'primary' : 'tertiary'}
                    className='bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg transition-shadow'
                    onPress={onClick}
                >
                    {icon}
                </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>{label}</Tooltip.Content>
        </Tooltip>
    );
}

// ─── 差异视图 ──────────────────────────────────────────────

type ViewMode = 'split' | 'opacity' | 'diff';

interface DiffViewProps {
    img1: string;
    img2: string;
    mode: ViewMode;
    onModeChange: (mode: ViewMode) => void;
    onSwap: () => void;
    onReselect: () => void;
    diffUrl: string | null;
}

function DiffView({ img1, img2, mode, onModeChange, onSwap, onReselect, diffUrl }: DiffViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);

    // 图片自然尺寸
    const [img1Nat, setImg1Nat] = useState<{ w: number; h: number } | null>(null);
    const [img2Nat, setImg2Nat] = useState<{ w: number; h: number } | null>(null);

    // 缩放 & 平移
    const [scale, setScale] = useState(1);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });

    // 透明度（0-100，图片2的不透明度）
    const [opacity, setOpacity] = useState(50);

    // 拖拽状态
    const [dragging, setDragging] = useState<'pan' | 'split' | null>(null);
    const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

    // ─── 容器尺寸监听 ──────────────────────────────────

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => {
            setContainerWidth(entry.contentRect.width);
            setContainerHeight(entry.contentRect.height);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // ─── 计算 fit 缩放 ────────────────────────────────

    const getFitScale = useCallback(() => {
        const nat = img1Nat || img2Nat;
        if (!nat || !containerWidth || !containerHeight) return 1;
        return Math.min(containerWidth / nat.w, containerHeight / nat.h, 1);
    }, [img1Nat, img2Nat, containerWidth, containerHeight]);

    useEffect(() => {
        if ((img1Nat || img2Nat) && containerWidth && containerHeight) {
            setScale(getFitScale());
            setTranslate({ x: 0, y: 0 });
        }
    }, [img1Nat, img2Nat, containerWidth, containerHeight, getFitScale]);

    // ─── 滚轮缩放 ─────────────────────────────────────

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setScale((prev) => Math.min(Math.max(prev + delta, 0.1), 20));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    // ─── 指针事件（平移 & 分割线拖拽） ────────────────

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const isSplit = mode === 'split' && e.clientX > containerRef.current!.getBoundingClientRect().left + containerRef.current!.getBoundingClientRect().width / 2 - 20
            && e.clientX < containerRef.current!.getBoundingClientRect().left + containerRef.current!.getBoundingClientRect().width / 2 + 20;
        setDragging(isSplit ? 'split' : 'pan');
        dragStart.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, [mode, translate]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!dragging) return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setTranslate({
            x: dragStart.current.tx + dx,
            y: dragStart.current.ty + dy,
        });
    }, [dragging]);

    const handlePointerUp = useCallback(() => {
        setDragging(null);
    }, []);

    // ─── 缩放控制 ─────────────────────────────────────

    const zoomIn = () => setScale((s) => Math.min(s * 1.25, 20));
    const zoomOut = () => setScale((s) => Math.max(s / 1.25, 0.1));
    const resetPosition = () => {
        setScale(getFitScale());
        setTranslate({ x: 0, y: 0 });
    };

    // ─── 分割线 clip-path 计算 ────────────────────────
    //
    // 分割线固定在视口 50% 位置，拖拽时图片移动。
    // clip-path 在图片元素的本地坐标系中工作：
    //   clip% = (viewportSplit - panOffset) / displayWidth * 100
    //
    // 其中：
    //   viewportSplit = 50% 视口 = vw/2
    //   panOffset = 图片左边缘距视口左边缘的距离 = (vw - Wd)/2 + panX
    //   displayWidth = 图片 CSS 宽度（缩放前）
    //
    // 简化后：clip% = (vw/2 - panX) / (Wd * scale) * 100
    // 除以 scale 是因为 clip-path 在图片本地坐标系中，
    // 而 translate 是视口像素，缩放后两者比例为 1/scale

    const splitClipX = (() => {
        if (!containerWidth) return 50;
        const nat = img1Nat || img2Nat;
        if (!nat) return 50;
        // 图片 CSS 宽度（contain 模式，缩放前）
        const displayWidth = Math.min(containerWidth / nat.w, containerHeight / nat.h, 1) * nat.w;
        if (displayWidth <= 0) return 50;
        // 分割线在视口 50% 位置，减去平移量，除以缩放后的显示宽度
        const clip = ((containerWidth / 2 - translate.x) / (displayWidth * scale)) * 100;
        return Math.max(0, Math.min(100, clip));
    })();

    const leftClip = mode === 'split'
        ? `polygon(0 0, ${splitClipX}% 0, ${splitClipX}% 100%, 0 100%)`
        : undefined;

    const cursor = dragging === 'pan' ? 'grabbing'
        : dragging === 'split' ? 'ew-resize'
        : mode === 'split' ? 'ew-resize'
        : mode === 'diff' ? 'zoom-in'
        : 'grab';

    return (
        <div
            ref={containerRef}
            className='relative w-full h-full rounded-lg border border-gray-200 bg-gray-50 select-none overflow-hidden'
            style={{ cursor }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            {/* 图片层（缩放 + 平移） */}
            <div
                className='absolute inset-0'
                style={{
                    transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                    transformOrigin: 'center center',
                }}
            >
                {/* 图片2（底层，diff 模式下隐藏） */}
                {mode !== 'diff' && (
                    <img
                        src={img2}
                        alt='图片2'
                        draggable={false}
                        onLoad={(e) => setImg2Nat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                        style={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            maxWidth: 'none',
                            maxHeight: 'none',
                            opacity: mode === 'opacity' ? opacity / 100 : 1,
                        }}
                    />
                )}

                {/* 图片1（上层，分割模式下 clip-path 裁剪） */}
                {mode !== 'diff' && (
                    <img
                        src={img1}
                        alt='图片1'
                        draggable={false}
                        onLoad={(e) => setImg1Nat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                        style={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            maxWidth: 'none',
                            maxHeight: 'none',
                            clipPath: leftClip,
                            opacity: mode === 'opacity' ? 1 - opacity / 100 : 1,
                        }}
                    />
                )}

                {/* 差异图（diff 模式） */}
                {mode === 'diff' && diffUrl && (
                    <img
                        src={diffUrl}
                        alt='差异图'
                        draggable={false}
                        style={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            maxWidth: 'none',
                            maxHeight: 'none',
                        }}
                    />
                )}
            </div>

            {/* ─── 固定分割线（仅 split 模式，视口 50%） ─── */}
            {mode === 'split' && (
                <>
                    <div
                        className='absolute top-0 bottom-0 w-0.5 bg-white shadow-md z-10 pointer-events-none'
                        style={{ left: '50%', transform: 'translateX(-50%)' }}
                    />
                    {/* 中间圆形手柄 */}
                    <div
                        className='absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white shadow-md z-10 pointer-events-none flex items-center justify-center'
                        style={{ left: '50%' }}
                    >
                        <span className='text-gray-400 text-xs select-none'>⇔</span>
                    </div>
                    {/* 标签 */}
                    <div className='absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded z-20 pointer-events-none'>
                        图片 1
                    </div>
                    <div className='absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded z-20 pointer-events-none'>
                        图片 2
                    </div>
                </>
            )}

            {/* ─── 透明度标签（仅 opacity 模式） ──────── */}
            {mode === 'opacity' && (
                <>
                    <div className='absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded z-20 pointer-events-none'>
                        图片 1 ({Math.round(100 - opacity)}%)
                    </div>
                    <div className='absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded z-20 pointer-events-none'>
                        图片 2 ({Math.round(opacity)}%)
                    </div>
                </>
            )}

            {/* ─── 悬浮透明度拖拽条（仅 opacity 模式） ── */}
            {mode === 'opacity' && (
                <div className='absolute bottom-12 left-1/2 -translate-x-1/2 z-20 w-64 pointer-events-auto'>
                    <div className='flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-3 py-2 shadow-md'>
                        <span className='text-xs text-gray-500 shrink-0'>1</span>
                        <div className='relative flex-1 h-6 bg-gray-200 rounded-full cursor-pointer'>
                            <div
                                className='absolute inset-0 rounded-full'
                                style={{ background: 'linear-gradient(to right, rgba(59,130,246,0.3), rgba(239,68,68,0.3))' }}
                            />
                            <input
                                type='range'
                                min={0}
                                max={100}
                                value={opacity}
                                onChange={(e) => setOpacity(Number(e.target.value))}
                                className='absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10'
                                onPointerDown={(e) => e.stopPropagation()}
                            />
                            <div
                                className='absolute top-1/2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none'
                                style={{ left: `${opacity}%` }}
                            />
                        </div>
                        <span className='text-xs text-gray-500 shrink-0'>2</span>
                    </div>
                </div>
            )}

            {/* ─── 悬浮控制按钮（右侧居中） ──────────── */}
            <div className='absolute right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5'>
                <FloatingButton
                    label='分割模式'
                    icon='✂️'
                    isActive={mode === 'split'}
                    onClick={() => onModeChange('split')}
                />
                <FloatingButton
                    label='透明度模式'
                    icon='🌓'
                    isActive={mode === 'opacity'}
                    onClick={() => onModeChange('opacity')}
                />
                <FloatingButton
                    label='差异模式'
                    icon='🔍'
                    isActive={mode === 'diff'}
                    onClick={() => onModeChange('diff')}
                />
                <div className='h-px bg-gray-300 my-0.5' />
                <FloatingButton label='交换图片' icon='⇅' onClick={onSwap} />
                <FloatingButton label='重选图片' icon='📷' onClick={onReselect} />
                {diffUrl && (
                    <FloatingButton
                        label='下载差异图'
                        icon='💾'
                        onClick={() => {
                            const link = document.createElement('a');
                            link.href = diffUrl;
                            link.download = 'diff-result.png';
                            link.click();
                        }}
                    />
                )}
            </div>

            {/* ─── 缩放控制按钮（右下角） ────────────── */}
            <div className='absolute bottom-3 right-3 flex flex-col gap-1.5 z-20'>
                <Button size='sm' isIconOnly variant='tertiary' className='bg-white/80 backdrop-blur-sm shadow-sm' onPress={resetPosition}>
                    ⟳
                </Button>
                <Button size='sm' isIconOnly variant='tertiary' className='bg-white/80 backdrop-blur-sm shadow-sm' onPress={zoomIn}>
                    +
                </Button>
                <Button size='sm' isIconOnly variant='tertiary' className='bg-white/80 backdrop-blur-sm shadow-sm' onPress={zoomOut}>
                    −
                </Button>
            </div>

            {/* 缩放比例 */}
            <div className='absolute bottom-3 left-3 bg-white/80 backdrop-blur-sm rounded px-2 py-0.5 text-xs font-medium shadow-sm z-20 pointer-events-none'>
                {Math.round(scale * 100)}%
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
    const [mode, setMode] = useState<ViewMode>('split');

    const bothLoaded = !!(url1 && url2);

    // 图片加载后锁定页面滚动
    useEffect(() => {
        if (!bothLoaded) return;
        const prev = document.body.style.overflow;
        const prevHtml = document.documentElement.style.overflow;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
            document.documentElement.style.overflow = prevHtml;
        };
    }, [bothLoaded]);

    // 组件卸载时清理 object URLs
    const urlsRef = useRef({ url1, url2, diffUrl });
    urlsRef.current = { url1, url2, diffUrl };
    useEffect(() => {
        return () => {
            const { url1: u1, url2: u2, diffUrl: d } = urlsRef.current;
            if (u1) URL.revokeObjectURL(u1);
            if (u2) URL.revokeObjectURL(u2);
            if (d) URL.revokeObjectURL(d);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

    // 交换两张图片（不撤销 URL，避免组件重新挂载）
    const swapImages = useCallback(() => {
        const tmpUrl = url1;
        const tmpFile = file1;
        setUrl1(url2);
        setUrl2(tmpUrl);
        setFile1(file2);
        setFile2(tmpFile);
        // diff 与图片顺序无关，无需重新计算
    }, [url1, url2, file1, file2]);

    // 重新选择
    const handleReselect = useCallback(() => {
        clearFile1();
        clearFile2();
    }, [clearFile1, clearFile2]);

    // 自动计算 diff
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

    return (
        <ToolLayout
            title='图片对比'
            description='逐像素对比两张图片的差异'
        >
            {!bothLoaded ? (
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
                <div className='flex-1 min-h-0'>
                    {isComputing ? (
                        <div className='h-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200'>
                            <div className='text-center'>
                                <div className='text-4xl mb-2 animate-spin'>⏳</div>
                                <p className='text-gray-500'>计算像素差异中...</p>
                            </div>
                        </div>
                    ) : (
                        <DiffView
                            img1={url1}
                            img2={url2}
                            mode={mode}
                            onModeChange={setMode}
                            onSwap={swapImages}
                            onReselect={handleReselect}
                            diffUrl={diffUrl}
                        />
                    )}
                </div>
            )}
        </ToolLayout>
    );
}
