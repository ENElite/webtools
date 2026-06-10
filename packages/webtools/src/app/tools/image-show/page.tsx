'use client';

import { useState, useRef, useCallback } from 'react';
import { Button, Card, CardBody, CardFooter, Spacer } from '@heroui/react';
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
  const [isDragActive, setIsDragActive] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    const url = URL.createObjectURL(file);
    setImageUrl(url);

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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <ToolLayout
      title="图片查看器"
      description="选择并预览图片，支持多种格式和缩放功能"
    >
      <div className="max-w-4xl mx-auto">
        {!imageUrl ? (
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInput}
            />
            <div className="text-6xl mb-4">🖼️</div>
            <h3 className="text-xl font-bold mb-2">
              {isDragActive ? '释放鼠标上传图片' : '点击或拖拽图片到此处'}
            </h3>
            <p className="text-gray-500">
              支持 PNG, JPG, GIF, WebP, BMP, SVG 格式
            </p>
          </div>
        ) : (
          <div>
            <Card className="w-full">
              <CardBody className="flex flex-col items-center p-4">
                <div className="relative w-full overflow-auto max-h-[60vh]">
                  <img
                    ref={imgRef}
                    src={imageUrl}
                    alt="预览图片"
                    className="max-w-full h-auto mx-auto rounded-lg"
                  />
                </div>
              </CardBody>
              <CardFooter className="flex flex-col items-start p-4">
                {imageInfo && (
                  <div className="w-full">
                    <h4 className="text-lg font-bold mb-2">图片信息</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">文件名：</span>
                        <span>{imageInfo.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">文件大小：</span>
                        <span>{formatFileSize(imageInfo.size)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">文件类型：</span>
                        <span>{imageInfo.type}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">尺寸：</span>
                        <span>
                          {imageInfo.width} × {imageInfo.height} 像素
                        </span>
                      </div>
                    </div>
                    <Spacer y={2} />
                    <div className="flex gap-2">
                      <Button
                        color="primary"
                        variant="flat"
                        onPress={() => {
                          const link = document.createElement('a');
                          link.href = imageUrl;
                          link.download = imageInfo.name;
                          link.click();
                        }}
                      >
                        下载图片
                      </Button>
                      <Button color="danger" variant="light" onPress={reset}>
                        清除图片
                      </Button>
                    </div>
                  </div>
                )}
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
