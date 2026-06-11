'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@heroui/react';
import { ToolLayout } from '@/components/ToolLayout';
import {
    obfuscateImage,
    obfuscateRegion,
    detectMarkers,
} from '@/lib/image-obfuscate';

export default function ImageObfuscatePage() {
    const [displayUrl, setDisplayUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDragActive, setIsDragActive] = useState(false);
    const [fileName, setFileName] = useState('image');
    // 存储原始 ImageData 用于算法处理
    const originalImageDataRef = useRef<ImageData | null>(null);
    const displayImageDataRef = useRef<ImageData | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            if (displayUrl) URL.revokeObjectURL(displayUrl);
        };
    }, [displayUrl]);

    const loadImage = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }

        setFileName(file.name.replace(/\.[^.]+$/, ''));
        setIsProcessing(true);

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { setIsProcessing(false); return; }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            originalImageDataRef.current = imageData;
            displayImageDataRef.current = imageData;

            canvas.toBlob((blob) => {
                if (blob) {
                    if (displayUrl) URL.revokeObjectURL(displayUrl);
                    setDisplayUrl(URL.createObjectURL(blob));
                }
                setIsProcessing(false);
            }, 'image/png');
        };
        img.src = URL.createObjectURL(file);
    }, [displayUrl]);

    const handleObfuscate = useCallback(() => {
        const src = originalImageDataRef.current;
        if (!src) return;
        setIsProcessing(true);

        // 使用 setTimeout 让 UI 有时间更新
        setTimeout(() => {
            try {
                const result = obfuscateImage(src);
                displayImageDataRef.current = result;

                const canvas = document.createElement('canvas');
                canvas.width = result.width;
                canvas.height = result.height;
                canvas.getContext('2d')!.putImageData(result, 0, 0);
                canvas.toBlob((blob) => {
                    if (blob) {
                        if (displayUrl) URL.revokeObjectURL(displayUrl);
                        setDisplayUrl(URL.createObjectURL(blob));
                    }
                    setIsProcessing(false);
                }, 'image/png');
            } catch (e) {
                alert(`混淆失败: ${e instanceof Error ? e.message : String(e)}`);
                setIsProcessing(false);
            }
        }, 50);
    }, [displayUrl]);

    const handleDeobfuscate = useCallback(() => {
        const src = displayImageDataRef.current;
        if (!src) return;
        setIsProcessing(true);

        setTimeout(() => {
            try {
                const markers = detectMarkers(src);
                if (markers.length === 0) {
                    alert('未检测到混淆标记，请确保上传的是由本工具生成的混淆图片。');
                    setIsProcessing(false);
                    return;
                }

                const firstMarker = markers[0];
                const cropX = firstMarker.pixelX - firstMarker.bx * 128;
                const cropY = firstMarker.pixelY - firstMarker.by * 128;

                let maxBx = 0, maxBy = 0;
                for (const m of markers) {
                    if (m.bx > maxBx) maxBx = m.bx;
                    if (m.by > maxBy) maxBy = m.by;
                }
                const origW = Math.max(src.width + cropX, (maxBx + 1) * 128);
                const origH = Math.max(src.height + cropY, (maxBy + 1) * 128);

                const result = obfuscateRegion(src, cropX, cropY, origW, origH);
                displayImageDataRef.current = result;

                const canvas = document.createElement('canvas');
                canvas.width = result.width;
                canvas.height = result.height;
                canvas.getContext('2d')!.putImageData(result, 0, 0);
                canvas.toBlob((blob) => {
                    if (blob) {
                        if (displayUrl) URL.revokeObjectURL(displayUrl);
                        setDisplayUrl(URL.createObjectURL(blob));
                    }
                    setIsProcessing(false);
                }, 'image/png');
            } catch (e) {
                alert(`反混淆失败: ${e instanceof Error ? e.message : String(e)}`);
                setIsProcessing(false);
            }
        }, 50);
    }, [displayUrl]);

    const handleSave = useCallback(() => {
        const imgData = displayImageDataRef.current;
        if (!imgData) return;
        const canvas = document.createElement('canvas');
        canvas.width = imgData.width;
        canvas.height = imgData.height;
        canvas.getContext('2d')!.putImageData(imgData, 0, 0);
        const link = document.createElement('a');
        link.download = `${fileName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }, [fileName]);

    const handleReselect = useCallback(() => {
        if (displayUrl) URL.revokeObjectURL(displayUrl);
        setDisplayUrl(null);
        originalImageDataRef.current = null;
        displayImageDataRef.current = null;
        if (fileInputRef.current) fileInputRef.current.value = '';
        fileInputRef.current?.click();
    }, [displayUrl]);

    const onDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragActive(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragActive(false);
    }, []);

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragActive(false);
        if (e.dataTransfer.files?.[0]) loadImage(e.dataTransfer.files[0]);
    }, [loadImage]);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) loadImage(e.target.files[0]);
    };

    return (
        <ToolLayout
            title='图片混淆'
            description='打乱像素位置保护隐私，混淆两次可还原原图'
        >
            <div className='max-w-4xl mx-auto'>
                <input
                    ref={fileInputRef}
                    type='file'
                    accept='image/*'
                    className='hidden'
                    onChange={handleFileInput}
                />

                {!displayUrl ? (
                    <div
                        className={`border-2 border-dashed rounded-lg p-16 text-center cursor-pointer transition-colors ${
                            isDragActive
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-300 hover:border-blue-500'
                        }`}
                        onDragEnter={onDragEnter}
                        onDragLeave={onDragLeave}
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className='text-6xl mb-4'>🖼️</div>
                        <h3 className='text-xl font-bold mb-2'>
                            {isDragActive ? '释放鼠标上传图片' : '点击或拖拽图片到此处'}
                        </h3>
                        <p className='text-gray-500'>
                            支持 PNG, JPG, GIF, WebP, BMP 格式
                        </p>
                    </div>
                ) : (
                    <>
                        <div
                            className='relative rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:border-blue-400 transition-colors group'
                            onClick={handleReselect}
                        >
                            {isProcessing ? (
                                <div className='w-full flex items-center justify-center bg-gray-50 py-32'>
                                    <div className='text-center'>
                                        <div className='text-4xl mb-2 animate-spin'>⏳</div>
                                        <p className='text-gray-500'>处理中...</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <img
                                        src={displayUrl}
                                        alt='当前图片'
                                        className='w-full h-auto max-h-[65vh] object-contain'
                                    />
                                    <div className='absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none'>
                                        <span className='opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-1 rounded-full text-sm font-medium shadow'>
                                            点击重新选择图片
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* 操作按钮 */}
                        <div className='flex items-center justify-center gap-3 mt-4'>
                            <Button
                                variant='primary'
                                onPress={handleObfuscate}
                                isDisabled={isProcessing}
                            >
                                🔒 混淆
                            </Button>
                            <Button
                                variant='secondary'
                                onPress={handleDeobfuscate}
                                isDisabled={isProcessing}
                            >
                                🔓 反混淆
                            </Button>
                            <Button
                                variant='tertiary'
                                onPress={handleSave}
                                isDisabled={isProcessing}
                            >
                                💾 保存
                            </Button>
                            <Button
                                variant='ghost'
                                onPress={handleReselect}
                                isDisabled={isProcessing}
                            >
                                🔄 重选
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </ToolLayout>
    );
}
