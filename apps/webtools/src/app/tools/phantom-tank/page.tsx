'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { Alert, Button, Checkbox, FileUpload, Progress } from '@webtools/ui';
import { ToolLayout } from '@/components/ToolLayout';
import { ImageViewer } from '@/components/ImageViewer';
import { CollapsibleSection, ResultPlaceholder } from '@/components/ToolPatterns';
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

// ── 图片上传区 ──────────────────────────────────────────

function ImageDropZone({
    label, hint, image, previewBg, fileRef, onFile,
}: {
    label: string;
    hint: string;
    image: ImageSlot | null;
    previewBg: 'white' | 'black';
    fileRef: React.RefObject<HTMLInputElement | null>;
    onFile: (file: File) => void;
}) {
    return (
        <div className='flex-1 min-w-0'>
            <div className='text-center mb-2'>
                <h3 className='font-semibold text-sm'>{label}</h3>
                <p className='text-xs text-[var(--wt-color-text-muted)]'>
                    {image
                        ? `${image.width}×${image.height} · 亮度 ${Math.round(image.brightness)}`
                        : hint}
                </p>
            </div>
            {image ? (
                <div>
                    <input ref={fileRef} type='file' accept='image/*' className='hidden'
                        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
                    <button
                        type='button'
                        className='relative flex h-48 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[var(--wt-radius-lg)] border border-[var(--wt-color-border)] transition hover:-translate-y-0.5 hover:border-[var(--wt-color-accent)] hover:shadow-lg'
                        style={{ backgroundColor: previewBg === 'white' ? '#fff' : '#1a1a1a' }}
                        onClick={() => fileRef.current?.click()}
                    >
                        <img src={image.url} alt={label} className='max-w-full max-h-full object-contain p-2' />
                        <span className='absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full'>
                            亮度 {Math.round(image.brightness)}
                        </span>
                    </button>
                </div>
            ) : (
                <FileUpload
                    accept='image/*'
                    maxFiles={1}
                    label='点击或拖拽图片'
                    description='PNG、JPG 或 WebP'
                    onFilesChange={(files: File[]) => files[0] && onFile(files[0])}
                />
            )}
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
    const [previewBg, setPreviewBg] = useState<'white' | 'black'>('white');
    const [showResult, setShowResult] = useState(false);
    const [useGrayscale, setUseGrayscale] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
            imageDataA: { width: number; height: number; bufferA: ArrayBuffer };
            imageDataB: { width: number; height: number; bufferB: ArrayBuffer };
            useGrayscale: boolean;
        },
        {
            width: number;
            height: number;
            buffer: ArrayBuffer;
        }
    >(workerFactory);

    // 加载图片（异步，避免阻塞主线程）
    const loadImage = useCallback((file: File, slot: 'A' | 'B') => {
        if (!file.type.startsWith('image/')) {
            setError('请选择有效的图片文件。');
            return;
        }
        setError(null);
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
            if (slot === 'A') {
                setImageA(slotData);
            } else {
                setImageB(slotData);
            }
            // 延后计算亮度，不阻塞 UI
            requestIdleCallback(() => {
                const b = getImageBrightness(imageData);
                const updater = (prev: ImageSlot | null) => prev?.url === url ? { ...prev, brightness: b } : prev;
                if (slot === 'A') {
                    setImageA(updater);
                } else {
                    setImageB(updater);
                }
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
                    if (slot === 'A') {
                        setImageA({ url, brightness: 0, width: img.width, height: img.height });
                    } else {
                        setImageB({ url, brightness: 0, width: img.width, height: img.height });
                    }
                    requestIdleCallback(() => {
                        const b = getImageBrightness(imageData);
                        const updater = (prev: ImageSlot | null) => prev?.url === url ? { ...prev, brightness: b } : prev;
                        if (slot === 'A') {
                            setImageA(updater);
                        } else {
                            setImageB(updater);
                        }
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
                if (slot === 'A') {
                    setImageA({ url, brightness: 0, width: img.width, height: img.height });
                } else {
                    setImageB({ url, brightness: 0, width: img.width, height: img.height });
                }
                requestIdleCallback(() => {
                    const b = getImageBrightness(imageData);
                    const updater = (prev: ImageSlot | null) => prev?.url === url ? { ...prev, brightness: b } : prev;
                    if (slot === 'A') {
                        setImageA(updater);
                    } else {
                        setImageB(updater);
                    }
                });
            };
            img.src = url;
        }
    }, []);

    // 生成
    const handleGenerate = useCallback(async () => {
        if (!imageA || !imageB) return;
        const aData = imageDataMapRef.current.get(imageA.url);
        const bData = imageDataMapRef.current.get(imageB.url);
        if (!aData || !bData) return;
        setIsProcessing(true);
        setProgress(0);

        try {
            // 复制数据并转移所有权给 Worker，避免 structured clone 开销
            const bufferA = new Uint8ClampedArray(aData.data).buffer;
            const bufferB = new Uint8ClampedArray(bData.data).buffer;

            const result = await workerPostMessage(
                {
                    imageDataA: { width: aData.width, height: aData.height, bufferA },
                    imageDataB: { width: bData.width, height: bData.height, bufferB },
                    useGrayscale,
                },
                (p) => setProgress(p),
                [bufferA, bufferB], // 转移两个输入 buffer 的所有权
            );

            // 从 Worker 接收的 buffer 已转移所有权，直接使用
            const imageData = new ImageData(
                new Uint8ClampedArray(result.buffer),
                result.width,
                result.height,
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
            setError(`生成失败：${e instanceof Error ? e.message : String(e)}`);
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
        setError(null);
        if (fileARef.current) fileARef.current.value = '';
        if (fileBRef.current) fileBRef.current.value = '';
    }, []);

    return (
        <ToolLayout
            title='幻影坦克'
            description='图片叠加 — 在白色背景上显示图A，在黑色背景上显示图B'
        >
            <div className='max-w-5xl mx-auto space-y-6 w-full'>
                {error && <Alert tone='danger' title='幻影坦克生成失败'>{error}</Alert>}
                {/* 上传区域 */}
                <div className='flex shrink-0 flex-col gap-4 sm:flex-row'>
                    <ImageDropZone
                        label='图片 A（主图 · 白底显示）'
                        hint='点击或拖拽图片'
                        image={imageA}
                        previewBg='white'
                        fileRef={fileARef}
                        onFile={(f) => loadImage(f, 'A')}
                    />
                    <div className='flex flex-col items-center justify-center shrink-0 gap-2'>
                        <span className='text-2xl font-light text-[var(--wt-color-border-strong)]'>+</span>
                        <Button
                            size='sm'
                            variant='ghost'
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
                        </Button>
                    </div>
                    <ImageDropZone
                        label='图片 B（副图 · 黑底显示）'
                        hint='点击或拖拽图片'
                        image={imageB}
                        previewBg='black'
                        fileRef={fileBRef}
                        onFile={(f) => loadImage(f, 'B')}
                    />
                </div>

                {/* 操作按钮 */}
                <div className='flex shrink-0 items-center justify-center gap-3'>
                    <Checkbox
                        checked={useGrayscale}
                        onCheckedChange={setUseGrayscale}
                        label='🔲 灰度模式（自动调整色阶，保留双方细节）'
                    />
                </div>
                <div className='flex items-center justify-center gap-3 shrink-0'>
                    <Button
                        onClick={handleGenerate}
                        disabled={!imageA || !imageB || isProcessing}
                        loading={isProcessing}
                    >
                        👻 生成幻影坦克
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!showResult || isProcessing}
                    >
                        💾 保存结果
                    </Button>
                    <Button
                        variant='ghost'
                        onClick={handleReset}
                        disabled={isProcessing}
                    >
                        🔄 重选
                    </Button>
                </div>

                {/* 处理进度条 */}
                {isProcessing && progress > 0 && (
                    <Progress value={progress * 100} label='正在合成两张图片' showValue />
                )}
                {imageA && imageB && (
                    <div className='space-y-2 shrink-0'>
                        <p className='text-center text-xs text-[var(--wt-color-text-muted)]'>
                            输出尺寸将以主图 A 为准（{imageA.width}×{imageA.height}），
                            副图 B 将自动缩放适配
                        </p>
                        <p className='text-center text-xs text-[var(--wt-color-text-muted)]'>
                            图A 平均亮度: {Math.round(imageA.brightness)} · 图B 平均亮度: {Math.round(imageB.brightness)}
                        </p>
                        {!useGrayscale && imageA.brightness < imageB.brightness && (
                            <Alert tone='warning' title='建议交换图片'>
                                图A（{Math.round(imageA.brightness)}）比图B（{Math.round(imageB.brightness)}）更暗，
                                算法要求图A亮度 ≥ 图B。建议交换两张图片的位置，或选择更亮的图片作为图A。
                            </Alert>
                        )}
                    </div>
                )}

                {/* 结果预览 */}
                {showResult && resultUrl && (
                    <div className='flex flex-col space-y-3'>
                        {/* 背景切换按钮 */}
                        <div className='flex items-center justify-center gap-2 shrink-0'>
                            <span className='mr-2 text-sm text-[var(--wt-color-text-muted)]'>预览背景：</span>
                            <Button
                                size='sm'
                                variant={previewBg === 'white' ? 'primary' : 'ghost'}
                                onClick={() => setPreviewBg('white')}
                            >
                                ☀️ 白色（看图A）
                            </Button>
                            <Button
                                size='sm'
                                variant={previewBg === 'black' ? 'primary' : 'ghost'}
                                onClick={() => setPreviewBg('black')}
                            >
                                🌙 黑色（看图B）
                            </Button>
                        </div>

                        {/* 预览容器 */}
                        <div className='min-h-75 h-[50vh] overflow-hidden rounded-[var(--wt-radius-lg)] border border-[var(--wt-color-border)]'>
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
                    <ResultPlaceholder
                        icon={<span className='text-4xl'>👻</span>}
                        title='等待两张图片'
                        description='上传主图与副图后，就可以生成幻影坦克。'
                    />
                )}

                {/* 算法原理说明 */}
                <div className='shrink-0 space-y-3'>
                    <CollapsibleSection title='📐 算法原理'>
                        <h4 className='font-semibold text-[var(--wt-color-text)]'>1. 标准 Alpha 合成公式</h4>
                        <p>
                            浏览器标准的非预乘 Alpha 合成：
                        </p>
                        <div className='overflow-x-auto rounded-[var(--wt-radius-md)] bg-[var(--wt-color-surface-tinted)] p-3 font-mono text-xs'>
                            <div>白色背景 (C_w = 255): R = P × α + 255 × (1 - α)</div>
                            <div>黑色背景 (C_b = 0):   R = P × α</div>
                        </div>

                        <h4 className='font-semibold text-[var(--wt-color-text)]'>2. 求解方程组</h4>
                        <p>
                            令白色背景合成结果 = 图A 像素值，黑色背景合成结果 = 图B 像素值：
                        </p>
                        <div className='overflow-x-auto rounded-[var(--wt-radius-md)] bg-[var(--wt-color-surface-tinted)] p-3 font-mono text-xs'>
                            <div>α = 1 - (A - B) / 255  （需要 A ≥ B）</div>
                            <div>P = B / α = 255B / (255 - A + B)</div>
                        </div>
                        <p className='mt-1 text-sm text-[var(--wt-color-text-muted)]'>
                            关键：结果图 RGB 不是 B，而是 B/α。这样才能在标准合成下精确还原。
                        </p>

                        <h4 className='font-semibold text-[var(--wt-color-text)]'>3. 三通道平均与颜色限制</h4>
                        <p>
                            对 R/G/B 三通道分别计算 alpha 值后取平均。由于 RGBA 只有一个 alpha 通道，
                            无法为三通道存储不同的 alpha，因此白底视图的<strong>颜色关系由图 B 决定</strong>。
                        </p>
                        <Alert tone='warning' title='颜色保留限制'>
                            <p>
                                如果图 B 是灰度图，图 A 在白底上也会显示为灰度。
                                要保留图 A 的颜色，图 B 应选择与图 A 色彩特征相似（如色调相近）但整体更暗的图片。
                                或使用<strong>灰度模式</strong>，完全避免颜色问题。
                            </p>
                        </Alert>

                        <h4 className='font-semibold text-[var(--wt-color-text)]'>4. 约束条件（重要）</h4>
                        <Alert tone='danger' title='必须满足 A ≥ B（每个像素）'>
                            <p>
                                图A（白底显示）的每个像素亮度必须 ≥ 图B（黑底显示）对应像素。
                                违反时该像素的 alpha 被钳制为 1，导致该像素在两种背景下都显示图B。
                            </p>
                        </Alert>
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
