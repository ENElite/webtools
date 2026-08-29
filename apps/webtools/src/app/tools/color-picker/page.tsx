'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useEyeDropper, useDropZone, useClipboard } from '@reactuses/core';
import { Alert, Button, Card, CardContent, EmptyState, FileUpload, IconButton } from '@webtools/ui';
import { ToolLayout } from '@/components/ToolLayout';

interface PickedColor {
    hex: string;
    rgb: string;
    rgba: string;
    raw: { r: number; g: number; b: number; a: number };
}

function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

/**
 * 颜色拾取器
 * - 优先使用 EyeDropper API（屏幕取色）
 * - 不支持时使用 canvas 取色（从上传的图片中取色）
 */
export default function ColorPickerPage() {
    const [pickedColor, setPickedColor] = useState<PickedColor | null>(null);
    const [history, setHistory] = useState<PickedColor[]>([]);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 使用 @reactuses/core 的 hooks
    const [isEyeDropperSupported, openEyeDropper] = useEyeDropper();
    const [, copy] = useClipboard();
    const isOverDropZone = useDropZone(dropZoneRef, (files) => {
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    });

    // 清理 object URL
    useEffect(() => {
        return () => {
            if (imageSrc) URL.revokeObjectURL(imageSrc);
        };
    }, [imageSrc]);

    // ─── EyeDropper 取色 ─────────────────────────────────

    const pickWithEyeDropper = useCallback(async () => {
        try {
            const result = await openEyeDropper();
            const hex = result.sRGBHex;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            const color: PickedColor = {
                hex,
                rgb: `rgb(${r}, ${g}, ${b})`,
                rgba: `rgba(${r}, ${g}, ${b}, 1)`,
                raw: { r, g, b, a: 255 },
            };
            setPickedColor(color);
            setHistory((prev) => [color, ...prev].slice(0, 20));
        } catch (err) {
            // 用户取消或不支持，忽略
            console.error('EyeDropper error:', err);
        }
    }, [openEyeDropper]);

    // ─── Canvas 图片取色 ─────────────────────────────────

    const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
    }, []);

    const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d', { willReadFrequently: true });
        if (!canvas || !ctx) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);

        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const color: PickedColor = {
            hex: rgbToHex(pixel[0], pixel[1], pixel[2]),
            rgb: `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`,
            rgba: `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${(pixel[3] / 255).toFixed(2)})`,
            raw: { r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] },
        };
        setPickedColor(color);
        setHistory((prev) => [color, ...prev].slice(0, 20));
    }, []);

    // ─── 文件上传 ─────────────────────────────────

    const handleFile = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('请选择有效的图片文件。');
            return;
        }
        setError(null);
        if (imageSrc) URL.revokeObjectURL(imageSrc);
        setImageSrc(URL.createObjectURL(file));
    }, [imageSrc]);

    // ─── 复制 ─────────────────────────────────

    const copyToClipboard = useCallback(async (text: string) => {
        try {
            await copy(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            console.error('Copy failed');
        }
    }, [copy]);

    return (
        <ToolLayout
            title='取色器'
            description='从屏幕或图片中拾取颜色值'
        >
            <div className='max-w-4xl mx-auto'>
                {/* 取色方式选择 */}
                <div className='mb-6 flex flex-wrap gap-3'>
                    {isEyeDropperSupported && (
                        <Button
                            variant='primary'
                            onClick={pickWithEyeDropper}
                        >
                            🎯 屏幕取色
                        </Button>
                    )}
                    <Button
                        variant='secondary'
                        onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) handleFile(file);
                            };
                            input.click();
                        }}
                    >
                        🖼️ 从图片取色
                    </Button>
                </div>

                {!isEyeDropperSupported && (
                    <Alert tone='warning' title='当前浏览器不支持屏幕取色'>
                        当前浏览器不支持屏幕取色 API（EyeDropper），请使用图片取色模式。
                        Chrome / Edge 95+ 支持屏幕取色。
                    </Alert>
                )}
                {error && <Alert tone='danger' title='无法读取图片'>{error}</Alert>}

                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    {/* 左侧：取色区域 */}
                    <div
                        ref={dropZoneRef}
                        className={`relative rounded-[var(--wt-radius-lg)] ${isOverDropZone ? 'ring-2 ring-[var(--wt-color-focus)] ring-offset-2' : ''}`}
                    >
                        {imageSrc ? (
                            <div className='relative overflow-hidden rounded-[var(--wt-radius-lg)] border border-[var(--wt-color-border)]'>
                                <img
                                    ref={imgRef}
                                    src={imageSrc}
                                    alt='取色图片'
                                    className='hidden'
                                    onLoad={handleImageLoad}
                                />
                                <canvas
                                    ref={canvasRef}
                                    className='w-full h-auto cursor-crosshair block'
                                    onClick={handleCanvasClick}
                                />
                            </div>
                        ) : (
                            <FileUpload
                                accept='image/*'
                                maxFiles={1}
                                label='上传一张图片取色'
                                description='拖拽或点击上传，随后点击图片中的任意位置'
                                onFilesChange={(files: File[]) => files[0] && handleFile(files[0])}
                                onReject={() => setError('该文件不是受支持的图片格式。')}
                            />
                        )}
                    </div>

                    {/* 右侧：颜色信息 */}
                    <div>
                        {pickedColor ? (
                            <Card>
                                <CardContent className='space-y-4'>
                                {/* 颜色预览 */}
                                <div
                                    className='h-32 w-full rounded-[var(--wt-radius-lg)] border border-[var(--wt-color-border)] shadow-inner'
                                    style={{ backgroundColor: pickedColor.hex }}
                                />

                                {/* 颜色值 */}
                                <div className='space-y-2'>
                                    <ColorValueRow label='HEX' value={pickedColor.hex} onCopy={copyToClipboard} />
                                    <ColorValueRow label='RGB' value={pickedColor.rgb} onCopy={copyToClipboard} />
                                    <ColorValueRow label='RGBA' value={pickedColor.rgba} onCopy={copyToClipboard} />
                                </div>

                                {copied && (
                                    <Alert tone='success'>已复制到剪贴板。</Alert>
                                )}
                                </CardContent>
                            </Card>
                        ) : (
                            <EmptyState
                                icon={<span className='text-4xl'>🎨</span>}
                                title='还没有选中颜色'
                                description={isEyeDropperSupported ? '点击“屏幕取色”，或上传图片后点击取色。' : '上传图片后点击图片取色。'}
                                className='h-64'
                            />
                        )}

                        {/* 取色历史 */}
                        {history.length > 0 && (
                            <div className='mt-6'>
                                <h3 className='mb-2 text-sm font-medium text-[var(--wt-color-text-muted)]'>取色历史</h3>
                                <div className='flex flex-wrap gap-2'>
                                    {history.map((c, i) => (
                                        <IconButton
                                            key={`${c.hex}-${i}`}
                                            size='sm'
                                            variant='ghost'
                                            className='hover:scale-110'
                                            style={{ backgroundColor: c.hex }}
                                            aria-label={`复制颜色 ${c.hex}`}
                                            onClick={() => copyToClipboard(c.hex)}
                                        >
                                            <span className='sr-only'>{c.hex}</span>
                                        </IconButton>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ToolLayout>
    );
}

// ─── 辅助组件 ─────────────────────────────────

function ColorValueRow({
    label,
    value,
    onCopy,
}: {
    label: string;
    value: string;
    onCopy: (text: string) => void;
}) {
    return (
        <div className='flex items-center gap-2'>
            <span className='w-10 text-xs text-[var(--wt-color-text-muted)]'>{label}</span>
            <code className='flex-1 rounded-[var(--wt-radius-sm)] bg-[var(--wt-color-surface-tinted)] px-3 py-1.5 font-mono text-sm'>{value}</code>
            <IconButton size='sm' variant='ghost' onClick={() => onCopy(value)} aria-label={`复制 ${label}`}>
                📋
            </IconButton>
        </div>
    );
}
