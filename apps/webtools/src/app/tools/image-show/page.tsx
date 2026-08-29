'use client';

import { useState, useRef } from 'react';
import { Alert, Button, Card, CardContent, CardFooter, FileUpload, Toolbar } from '@webtools/ui';
import { ToolLayout } from '@/components/ToolLayout';

export default function ImageShowPage() {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [imageInfo, setImageInfo] = useState<{
        name: string;
        size: number;
        type: string;
        width: number;
        height: number;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const imgRef = useRef<HTMLImageElement>(null);

    const handleFile = (file: File) => {
    // 验证文件类型
        if (!file.type.startsWith('image/')) {
            setError('请选择有效的图片文件。');
            return;
        }

        setError(null);
        if (imageUrl) URL.revokeObjectURL(imageUrl);

        const url = URL.createObjectURL(file);
        setImageUrl(url);
        setZoom(1); // 重置缩放

        // 获取图片信息
        const img = new Image();
        img.onload = () => {
            setImageInfo({
                name: file.name,
                size: file.size,
                type: file.type,
                width: img.width,
                height: img.height,
            });
        };
        img.src = url;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const reset = () => {
        if (imageUrl) {
            URL.revokeObjectURL(imageUrl);
        }
        setImageUrl(null);
        setImageInfo(null);
        setZoom(1);
        setError(null);
    };

    const zoomIn = () => {
        setZoom((prev) => Math.min(prev + 0.25, 5));
    };

    const zoomOut = () => {
        setZoom((prev) => Math.max(prev - 0.25, 0.25));
    };

    const resetZoom = () => {
        setZoom(1);
    };

    return (
        <ToolLayout
            title='图片查看器'
            description='选择并预览图片，支持多种格式和缩放功能'
        >
            <div className='mx-auto w-full max-w-4xl space-y-4'>
                {error && <Alert tone='danger' title='无法打开图片'>{error}</Alert>}
                {!imageUrl ? (
                    <FileUpload
                        accept='image/*'
                        maxFiles={1}
                        label='把图片放到这里'
                        description='点击或拖拽上传，支持 PNG、JPG、GIF、WebP、BMP 和 SVG'
                        onFilesChange={(files: File[]) => files[0] && handleFile(files[0])}
                        onReject={() => setError('该文件不是受支持的图片格式。')}
                    />
                )
                    : (
                        <div className='space-y-4'>
                            {/* 缩放控制栏 */}
                            <Toolbar className='flex flex-wrap items-center justify-between gap-3'>
                                <div className='flex items-center gap-2'>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        onClick={zoomOut}
                                        disabled={zoom <= 0.25}
                                    >
                                        −
                                    </Button>
                                    <span className='text-sm font-medium min-w-[60px] text-center'>
                                        {Math.round(zoom * 100)}%
                                    </span>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        onClick={zoomIn}
                                        disabled={zoom >= 5}
                                    >
                                        +
                                    </Button>
                                    <Button size='sm' variant='ghost' onClick={resetZoom}>
                                        重置
                                    </Button>
                                </div>
                                <div className='flex items-center gap-2'>
                                    <Button
                                        variant='secondary'
                                        size='sm'
                                        onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = imageUrl;
                                            link.download = imageInfo?.name || 'image';
                                            link.click();
                                        }}
                                    >
                                        下载图片
                                    </Button>
                                    <Button variant='danger' size='sm' onClick={reset}>
                                        清除图片
                                    </Button>
                                </div>
                            </Toolbar>

                            <Card className='w-full'>
                                <CardContent className='flex flex-col items-center p-4'>
                                    <div className='relative w-full overflow-auto max-h-[60vh]'>
                                        <img
                                            ref={imgRef}
                                            src={imageUrl}
                                            alt='预览图片'
                                            className='max-w-full h-auto mx-auto rounded-lg transition-transform duration-200'
                                            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                                        />
                                    </div>
                                </CardContent>
                                {imageInfo && (
                                    <CardFooter className='flex flex-col items-start p-4'>
                                        <div className='w-full'>
                                            <h4 className='text-lg font-bold mb-2'>图片信息</h4>
                                            <div className='grid grid-cols-2 gap-2 text-sm'>
                                                <div>
                                                    <span className='text-[var(--wt-color-text-muted)]'>文件名：</span>
                                                    <span>{imageInfo.name}</span>
                                                </div>
                                                <div>
                                                    <span className='text-[var(--wt-color-text-muted)]'>文件大小：</span>
                                                    <span>{formatFileSize(imageInfo.size)}</span>
                                                </div>
                                                <div>
                                                    <span className='text-[var(--wt-color-text-muted)]'>文件类型：</span>
                                                    <span>{imageInfo.type}</span>
                                                </div>
                                                <div>
                                                    <span className='text-[var(--wt-color-text-muted)]'>尺寸：</span>
                                                    <span>
                                                        {imageInfo.width} × {imageInfo.height} 像素
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardFooter>
                                )}
                            </Card>
                        </div>
                    )}
            </div>
        </ToolLayout>
    );
}
