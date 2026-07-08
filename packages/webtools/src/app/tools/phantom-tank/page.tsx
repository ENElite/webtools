'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@heroui/react';
import { ToolLayout } from '@/components/ToolLayout';
import { ImageViewer } from '@/components/ImageViewer';
import { imageDataToBlobUrl } from '@/lib/image-diff';
import { useWorker } from '@/lib/useWorker';

// ── 辅助类型与函数 ──────────────────────────────────────

/** 轻量 state 类型 — 不含 ImageData，避免阻塞 React 渲染 */
interface ImageSlot {
    url: string;
    brightness: number;
    width: number;
    height: number;
}

function getImageBrightness({ width, height, data }: ImageData): number {
    // 每隔若干像素采样，大幅减少计算量（精度足够用于亮度比较）
    const step = Math.max(4, Math.floor(Math.sqrt(width * height / 1000)));
    let sum = 0, count = 0;
    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            const i = (y * width + x) * 4;
            sum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            count++;
        }
    }
    return sum / count;
}

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    return (
        <div className='border border-gray-200 rounded-lg overflow-hidden'>
            <button
                className='w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors'
                onClick={() => setOpen(!open)}
            >
                <span className='font-medium text-sm'>{title}</span>
                <span className='text-gray-400 text-xs'>{open ? '▲ 收起' : '▼ 展开'}</span>
            </button>
            {open && (
                <div className='px-4 pb-4 text-sm text-gray-600 leading-relaxed space-y-3 border-t border-gray-100'>
                    {children}
                </div>
            )}
        </div>
    );
}

// ── 图片上传区 ──────────────────────────────────────────

function ImageDropZone({
    label, hint, image, previewBg, isActive, fileRef, onFile, onDrop, onDragEnter,
}: {
    label: string;
    hint: string;
    image: ImageSlot | null;
    previewBg: 'white' | 'black';
    isActive: boolean;
    fileRef: React.RefObject<HTMLInputElement | null>;
    onFile: (file: File) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnter: (e: React.DragEvent) => void;
}) {
    return (
        <div className='flex-1 min-w-0'>
            <input ref={fileRef} type='file' accept='image/*' className='hidden'
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            <div className='text-center mb-2'>
                <h3 className='font-semibold text-sm'>{label}</h3>
                <p className='text-gray-400 text-xs'>
                    {image
                        ? `${image.width}×${image.height} · 亮度 ${Math.round(image.brightness)}`
                        : hint}
                </p>
            </div>
            <div
                className={`relative border-2 border-dashed rounded-lg h-48 flex flex-col items-center justify-center cursor-pointer transition-all ${image ? 'border-gray-200 hover:border-blue-400'
                    : isActive ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-500'
                    }`}
                style={image ? { backgroundColor: previewBg === 'white' ? '#fff' : '#1a1a1a' } : undefined}
                onDragEnter={onDragEnter}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
            >
                {image ? (
                    <>
                        <img src={image.url} alt={label} className='max-w-full max-h-full object-contain p-2' />
                        <span className='absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full'>
                            亮度 {Math.round(image.brightness)}
                        </span>
                    </>
                ) : (
                    <>
                        <div className='text-3xl mb-1'>🖼️</div>
                        <p className='text-gray-500 text-xs'>{isActive ? '释放鼠标上传' : '点击或拖拽图片'}</p>
                        <p className='text-gray-400 text-xs mt-0.5'>PNG, JPG, WebP</p>
                    </>
                )}
            </div>
        </div>
    );
}

export default function PhantomTankPage() {
    const [imageA, setImageA] = useState<ImageSlot | null>(null);
    const [imageB, setImageB] = useState<ImageSlot | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [resultImageData, setResultImageData] = useState<ImageData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [dragTarget, setDragTarget] = useState<'A' | 'B' | null>(null);
    const [previewBg, setPreviewBg] = useState<'white' | 'black'>('white');
    const [showResult, setShowResult] = useState(false);
    const [useGrayscale, setUseGrayscale] = useState(true);

    const fileARef = useRef<HTMLInputElement>(null);
    const fileBRef = useRef<HTMLInputElement>(null);

    // 用 ref 跟踪 blob URL，避免 cleanup 误撤销仍在使用的 URL
    const urlARef = useRef<string | null>(null);
    const urlBRef = useRef<string | null>(null);
    const urlResultRef = useRef<string | null>(null);

    // ImageData 存储在 ref 中，不经过 React state，避免交换时阻塞渲染
    const imageDataMapRef = useRef<Map<string, ImageData>>(new Map());

    // Web Worker：幻影坦克计算
    const workerFactory = useMemo(() => {
        return () => new Worker(new URL('@/workers/phantom-tank.worker.ts', import.meta.url));
    }, []);
    const { postMessage: workerPostMessage } = useWorker<
        {
            imageDataA: { width: number; height: number; data: Uint8ClampedArray };
            imageDataB: { width: number; height: number; data: Uint8ClampedArray };
            useGrayscale: boolean;
        },
        {
            imageData: { width: number; height: number; data: Uint8ClampedArray };
        }
    >(workerFactory);

    // 加载图片（异步，避免阻塞主线程）
    const loadImage = useCallback((file: File, slot: 'A' | 'B') => {
        if (!file.type.startsWith('image/')) return alert('请选择图片文件');
        const url = URL.createObjectURL(file);
        // 撤销旧 URL 并清理旧 ImageData
        if (slot === 'A' && urlARef.current) {
            URL.revokeObjectURL(urlARef.current);
            imageDataMapRef.current.delete(urlARef.current);
        }
        if (slot === 'B' && urlBRef.current) {
            URL.revokeObjectURL(urlBRef.current);
            imageDataMapRef.current.delete(urlBRef.current);
        }
        if (slot === 'A') urlARef.current = url;
        if (slot === 'B') urlBRef.current = url;

        const processBitmap = async (bitmap: ImageBitmap) => {
            const c = new OffscreenCanvas(bitmap.width, bitmap.height);
            const ctx = c.getContext('2d')!;
            ctx.drawImage(bitmap, 0, 0);
            bitmap.close();
            const imageData = ctx.getImageData(0, 0, c.width, c.height);
            // ImageData 存入 ref map，state 只保留轻量信息
            imageDataMapRef.current.set(url, imageData);
            const slotData: ImageSlot = { url, brightness: 0, width: c.width, height: c.height };
            slot === 'A' ? setImageA(slotData) : setImageB(slotData);
            // 延后计算亮度，不阻塞 UI
            requestIdleCallback(() => {
                const b = getImageBrightness(imageData);
                const updater = (prev: ImageSlot | null) => prev?.url === url ? { ...prev, brightness: b } : prev;
                slot === 'A' ? setImageA(updater) : setImageB(updater);
            });
        };

        // 优先使用 createImageBitmap + OffscreenCanvas（更快）
        if (typeof createImageBitmap !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
            createImageBitmap(file).then(processBitmap).catch(() => {
                // fallback
                const img = new Image();
                img.onload = () => {
                    const c = document.createElement('canvas');
                    c.width = img.width; c.height = img.height;
                    const ctx = c.getContext('2d')!;
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, img.width, img.height);
                    imageDataMapRef.current.set(url, imageData);
                    slot === 'A' ? setImageA({ url, brightness: 0, width: img.width, height: img.height }) : setImageB({ url, brightness: 0, width: img.width, height: img.height });
                    requestIdleCallback(() => {
                        const b = getImageBrightness(imageData);
                        const updater = (prev: ImageSlot | null) => prev?.url === url ? { ...prev, brightness: b } : prev;
                        slot === 'A' ? setImageA(updater) : setImageB(updater);
                    });
                };
                img.src = url;
            });
        } else {
            const img = new Image();
            img.onload = () => {
                const c = document.createElement('canvas');
                c.width = img.width; c.height = img.height;
                const ctx = c.getContext('2d')!;
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, img.width, img.height);
                imageDataMapRef.current.set(url, imageData);
                slot === 'A' ? setImageA({ url, brightness: 0, width: img.width, height: img.height }) : setImageB({ url, brightness: 0, width: img.width, height: img.height });
                requestIdleCallback(() => {
                    const b = getImageBrightness(imageData);
                    const updater = (prev: ImageSlot | null) => prev?.url === url ? { ...prev, brightness: b } : prev;
                    slot === 'A' ? setImageA(updater) : setImageB(updater);
                });
            };
            img.src = url;
        }
    }, []);

    // 拖拽处理
    const makeDropHandler = useCallback(
        (slot: 'A' | 'B') => (e: React.DragEvent) => {
            e.preventDefault(); e.stopPropagation();
            setDragTarget(null);
            if (e.dataTransfer.files?.[0]) loadImage(e.dataTransfer.files[0], slot);
        },
        [loadImage],
    );

    // 生成
    const handleGenerate = useCallback(async () => {
        if (!imageA || !imageB) return;
        const aData = imageDataMapRef.current.get(imageA.url);
        const bData = imageDataMapRef.current.get(imageB.url);
        if (!aData || !bData) return;
        setIsProcessing(true);
        setProgress(0);

        try {
            // 通过 Web Worker 执行计算，不阻塞主线程
            const result = await workerPostMessage(
                {
                    imageDataA: { width: aData.width, height: aData.height, data: new Uint8ClampedArray(aData.data) },
                    imageDataB: { width: bData.width, height: bData.height, data: new Uint8ClampedArray(bData.data) },
                    useGrayscale,
                },
                (p) => setProgress(p),
            );

            const imageData = new ImageData(
                new Uint8ClampedArray(result.imageData.data),
                result.imageData.width,
                result.imageData.height,
            );
            setResultImageData(imageData);
            const url = await imageDataToBlobUrl(imageData);
            if (urlResultRef.current) URL.revokeObjectURL(urlResultRef.current);
            urlResultRef.current = url;
            setResultUrl(url);
            setShowResult(true);
            setIsProcessing(false);
            setProgress(0);
        } catch (e) {
            alert(`生成失败: ${e instanceof Error ? e.message : String(e)}`);
            setIsProcessing(false);
            setProgress(0);
        }
    }, [imageA, imageB, useGrayscale, workerPostMessage]);

    // 保存
    const handleSave = useCallback(() => {
        if (!resultImageData) return;
        const c = document.createElement('canvas');
        c.width = resultImageData.width; c.height = resultImageData.height;
        c.getContext('2d')!.putImageData(resultImageData, 0, 0);
        const a = document.createElement('a');
        a.download = 'phantom-tank.png';
        a.href = c.toDataURL('image/png');
        a.click();
    }, [resultImageData]);

    // 重选
    const handleReset = useCallback(() => {
        if (urlARef.current) URL.revokeObjectURL(urlARef.current);
        if (urlBRef.current) URL.revokeObjectURL(urlBRef.current);
        if (urlResultRef.current) URL.revokeObjectURL(urlResultRef.current);
        urlARef.current = null; urlBRef.current = null; urlResultRef.current = null;
        imageDataMapRef.current.clear();
        setImageA(null); setImageB(null);
        setResultUrl(null); setResultImageData(null); setShowResult(false);
        if (fileARef.current) fileARef.current.value = '';
        if (fileBRef.current) fileBRef.current.value = '';
    }, []);

    return (
        <ToolLayout
            title='幻影坦克'
            description='图片叠加 — 在白色背景上显示图A，在黑色背景上显示图B'
        >
            <div className='max-w-5xl mx-auto space-y-6 w-full'>
                {/* 上传区域 */}
                <div className='flex gap-4 shrink-0'>
                    <ImageDropZone
                        label='图片 A（主图 · 白底显示）'
                        hint='点击或拖拽图片'
                        image={imageA}
                        previewBg='white'
                        isActive={dragTarget === 'A'}
                        fileRef={fileARef}
                        onFile={(f) => loadImage(f, 'A')}
                        onDrop={makeDropHandler('A')}
                        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragTarget('A'); }}
                    />
                    <div className='flex flex-col items-center justify-center shrink-0 gap-2'>
                        <span className='text-2xl text-gray-300 font-light'>+</span>
                        <button
                            className='text-xs text-blue-500 hover:text-blue-700 transition-colors whitespace-nowrap'
                            onClick={() => {
                                const tmpA = imageA, tmpB = imageB;
                                setImageA(tmpB); setImageB(tmpA);
                                // 交换 ref 中的 URL，不触发 revoke
                                const tmpUrl = urlARef.current;
                                urlARef.current = urlBRef.current;
                                urlBRef.current = tmpUrl;
                                setResultUrl(null); setResultImageData(null); setShowResult(false);
                            }}
                            disabled={!imageA && !imageB}
                        >
                            ⇄ 交换
                        </button>
                    </div>
                    <ImageDropZone
                        label='图片 B（副图 · 黑底显示）'
                        hint='点击或拖拽图片'
                        image={imageB}
                        previewBg='black'
                        isActive={dragTarget === 'B'}
                        fileRef={fileBRef}
                        onFile={(f) => loadImage(f, 'B')}
                        onDrop={makeDropHandler('B')}
                        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragTarget('B'); }}
                    />
                </div>

                {/* 操作按钮 */}
                <div className='flex items-center justify-center gap-3 shrink-0'>
                    <label className='flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none'>
                        <input
                            type='checkbox'
                            checked={useGrayscale}
                            onChange={(e) => setUseGrayscale(e.target.checked)}
                            className='w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                        />
                        <span>🔲 灰度模式（自动调整色阶，保留双方细节）</span>
                    </label>
                </div>
                <div className='flex items-center justify-center gap-3 shrink-0'>
                    <Button
                        onPress={handleGenerate}
                        isDisabled={!imageA || !imageB || isProcessing}
                    >
                        👻 生成幻影坦克
                    </Button>
                    <Button
                        onPress={handleSave}
                        isDisabled={!showResult || isProcessing}
                    >
                        💾 保存结果
                    </Button>
                    <Button
                        variant='ghost'
                        onPress={handleReset}
                        isDisabled={isProcessing}
                    >
                        🔄 重选
                    </Button>
                </div>

                {/* 处理进度条 */}
                {isProcessing && progress > 0 && (
                    <div className='shrink-0 space-y-1'>
                        <div className='bg-gray-200 rounded-full h-2 overflow-hidden'>
                            <div
                                className='bg-blue-500 h-full rounded-full transition-all duration-300'
                                style={{ width: `${Math.round(progress * 100)}%` }}
                            />
                        </div>
                        <p className='text-xs text-gray-400 text-center'>
                            处理中... {Math.round(progress * 100)}%
                        </p>
                    </div>
                )}
                {imageA && imageB && (
                    <div className='space-y-2 shrink-0'>
                        <p className='text-center text-xs text-gray-400'>
                            输出尺寸将以主图 A 为准（{imageA.width}×{imageA.height}），
                            副图 B 将自动缩放适配
                        </p>
                        <p className='text-center text-xs text-gray-400'>
                            图A 平均亮度: {Math.round(imageA.brightness)} · 图B 平均亮度: {Math.round(imageB.brightness)}
                        </p>
                        {!useGrayscale && imageA.brightness < imageB.brightness && (
                            <div className='bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-600 text-center'>
                                ⚠️ 图A（{Math.round(imageA.brightness)}）比图B（{Math.round(imageB.brightness)}）更暗，
                                算法要求图A亮度 ≥ 图B。建议交换两张图片的位置，或选择更亮的图片作为图A。
                            </div>
                        )}
                    </div>
                )}

                {/* 结果预览 */}
                {showResult && resultUrl && (
                    <div className='flex flex-col space-y-3'>
                        {/* 背景切换按钮 */}
                        <div className='flex items-center justify-center gap-2 shrink-0'>
                            <span className='text-sm text-gray-500 mr-2'>预览背景：</span>
                            <button
                                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${previewBg === 'white'
                                    ? 'bg-gray-800 text-white shadow'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                onClick={() => setPreviewBg('white')}
                            >
                                ☀️ 白色（看图A）
                            </button>
                            <button
                                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${previewBg === 'black'
                                    ? 'bg-gray-800 text-white shadow'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                onClick={() => setPreviewBg('black')}
                            >
                                🌙 黑色（看图B）
                            </button>
                        </div>

                        {/* 预览容器 */}
                        <div className='min-h-75 h-[50vh] rounded-lg overflow-hidden border border-gray-200'>
                            <ImageViewer
                                src={resultUrl}
                                alt='幻影坦克结果'
                                className='h-full border-0! rounded-none!'
                                containerStyle={{ backgroundColor: previewBg === 'white' ? '#ffffff' : '#000000' }}
                            />
                        </div>
                    </div>
                )}

                {/* 占位（未生成时填充剩余空间） */}
                {!showResult && (
                    <div className='min-h-50 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg text-gray-400'>
                        <div className='text-center'>
                            <div className='text-4xl mb-2'>👻</div>
                            <p className='text-sm'>上传两张图片后点击生成</p>
                        </div>
                    </div>
                )}

                {/* 算法原理说明 */}
                <div className='shrink-0 space-y-3'>
                    <CollapsibleSection title='📐 算法原理'>
                        <h4 className='font-semibold text-gray-800'>1. 标准 Alpha 合成公式</h4>
                        <p>
                            浏览器标准的非预乘 Alpha 合成：
                        </p>
                        <div className='bg-gray-50 rounded p-3 font-mono text-xs overflow-x-auto'>
                            <div>白色背景 (C_w = 255): R = P × α + 255 × (1 - α)</div>
                            <div>黑色背景 (C_b = 0):   R = P × α</div>
                        </div>

                        <h4 className='font-semibold text-gray-800'>2. 求解方程组</h4>
                        <p>
                            令白色背景合成结果 = 图A 像素值，黑色背景合成结果 = 图B 像素值：
                        </p>
                        <div className='bg-gray-50 rounded p-3 font-mono text-xs overflow-x-auto'>
                            <div>α = 1 - (A - B) / 255  （需要 A ≥ B）</div>
                            <div>P = B / α = 255B / (255 - A + B)</div>
                        </div>
                        <p className='text-sm text-gray-500 mt-1'>
                            关键：结果图 RGB 不是 B，而是 B/α。这样才能在标准合成下精确还原。
                        </p>

                        <h4 className='font-semibold text-gray-800'>3. 三通道平均与颜色限制</h4>
                        <p>
                            对 R/G/B 三通道分别计算 alpha 值后取平均。由于 RGBA 只有一个 alpha 通道，
                            无法为三通道存储不同的 alpha，因此白底视图的<strong>颜色关系由图 B 决定</strong>。
                        </p>
                        <div className='bg-amber-50 border border-amber-200 rounded p-3 text-sm'>
                            <p className='font-semibold text-amber-700 mb-1'>⚠️ 颜色保留限制</p>
                            <p className='text-amber-600'>
                                如果图 B 是灰度图，图 A 在白底上也会显示为灰度。
                                要保留图 A 的颜色，图 B 应选择与图 A 色彩特征相似（如色调相近）但整体更暗的图片。
                                或使用<strong>灰度模式</strong>，完全避免颜色问题。
                            </p>
                        </div>

                        <h4 className='font-semibold text-gray-800'>4. 约束条件（重要）</h4>
                        <div className='bg-red-50 border border-red-200 rounded p-3 text-sm'>
                            <p className='font-semibold text-red-700 mb-1'>必须满足 A ≥ B（每个像素）</p>
                            <p className='text-red-600'>
                                图A（白底显示）的每个像素亮度必须 ≥ 图B（黑底显示）对应像素。
                                违反时该像素的 alpha 被钳制为 1，导致该像素在两种背景下都显示图B。
                            </p>
                        </div>
                        <p>
                            <strong>选择策略：</strong>图A 应选整体偏亮的图片，图B 应选整体偏暗的图片。
                            如果上传后发现亮度不满足要求，工具会给出警告提示。
                        </p>
                    </CollapsibleSection>

                    <CollapsibleSection title='💡 使用建议'>
                        <ul className='list-disc list-inside space-y-1'>
                            <li>图A（主图）决定输出尺寸，图B（副图）将自动缩放适配</li>
                            <li>图A（白底显示）应选择<strong>整体偏亮</strong>的图片</li>
                            <li>图B（黑底显示）应选择<strong>整体偏暗</strong>的图片</li>
                            <li>图B 应选择与图A<strong>色彩特征相似</strong>的图片，否则图A的颜色会丢失</li>
                            <li><strong>灰度模式</strong>：勾选后自动将两张图转为灰度并调整色阶，确保 A ≥ B，适合任意图片组合</li>
                            <li>保存为 PNG 格式以保持无损质量（JPEG 压缩会破坏透明通道信息）</li>
                            <li>在聊天软件中发送时，深色模式下通常显示图B，浅色模式下显示图A</li>
                        </ul>
                    </CollapsibleSection>
                </div>
            </div>
        </ToolLayout>
    );
}
