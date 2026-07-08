'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@heroui/react';
import { ToolLayout } from '@/components/ToolLayout';
import { getObfuscateBlockInfo } from '@/lib/image-obfuscate';
import { useWorker } from '@/lib/useWorker';

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

export default function ImageObfuscatePage() {
    const [displayUrl, setDisplayUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isDragActive, setIsDragActive] = useState(false);
    const [fileName, setFileName] = useState('image');
    const [blockInfo, setBlockInfo] = useState<{ blockSize: number; cols: number; rows: number } | null>(null);
    const originalImageDataRef = useRef<ImageData | null>(null);
    const displayImageDataRef = useRef<ImageData | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Web Worker：混淆/反混淆计算
    const workerFactory = useMemo(() => {
        return () => new Worker(new URL('@/workers/obfuscate.worker.ts', import.meta.url));
    }, []);
    const { postMessage: workerPostMessage } = useWorker<
        { width: number; height: number; data: Uint8ClampedArray },
        { width: number; height: number; data: Uint8ClampedArray }
    >(workerFactory);

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

    const handleProcess = useCallback(async () => {
        const src = displayImageDataRef.current;
        if (!src) return;
        setIsProcessing(true);
        setProgress(0);

        try {
            // 通过 Web Worker 执行混淆计算，不阻塞主线程
            const result = await workerPostMessage(
                {
                    width: src.width,
                    height: src.height,
                    data: new Uint8ClampedArray(src.data),
                },
                (p) => setProgress(p),
            );

            const imageData = new ImageData(
                new Uint8ClampedArray(result.data),
                result.width,
                result.height,
            );
            displayImageDataRef.current = imageData;
            setBlockInfo(getObfuscateBlockInfo(src.width, src.height));

            const canvas = document.createElement('canvas');
            canvas.width = imageData.width;
            canvas.height = imageData.height;
            canvas.getContext('2d')!.putImageData(imageData, 0, 0);
            canvas.toBlob((blob) => {
                if (blob) {
                    if (displayUrl) URL.revokeObjectURL(displayUrl);
                    setDisplayUrl(URL.createObjectURL(blob));
                }
                setIsProcessing(false);
                setProgress(0);
            }, 'image/png');
        } catch (e) {
            alert(`处理失败: ${e instanceof Error ? e.message : String(e)}`);
            setIsProcessing(false);
            setProgress(0);
        }
    }, [displayUrl, workerPostMessage]);

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
        setBlockInfo(null);
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
            <div className='max-w-4xl mx-auto space-y-6'>
                <input
                    ref={fileInputRef}
                    type='file'
                    accept='image/*'
                    className='hidden'
                    onChange={handleFileInput}
                />

                {!displayUrl ? (
                    <div
                        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isDragActive
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-300 hover:border-blue-500'
                            }`}
                        onDragEnter={onDragEnter}
                        onDragLeave={onDragLeave}
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className='text-5xl mb-3'>🖼️</div>
                        <h3 className='text-lg font-bold mb-1'>
                            {isDragActive ? '释放鼠标上传图片' : '点击或拖拽图片到此处'}
                        </h3>
                        <p className='text-gray-500 text-sm'>
                            支持 PNG, JPG, GIF, WebP, BMP 格式
                        </p>
                    </div>
                ) : (
                    <>
                        <div
                            className='relative rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:border-blue-400 transition-colors group'
                            onClick={isProcessing ? undefined : handleReselect}
                        >
                            <img
                                src={displayUrl}
                                alt='当前图片'
                                className='w-full h-auto max-h-[50vh] object-contain'
                            />
                            {isProcessing && (
                                <div className='absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none'>
                                    <div className='text-center text-white'>
                                        <div className='text-4xl mb-2 animate-spin'>⏳</div>
                                        <p>处理中...</p>
                                        {progress > 0 && (
                                            <div className='mt-3 w-48 mx-auto'>
                                                <div className='bg-white/20 rounded-full h-2 overflow-hidden'>
                                                    <div
                                                        className='bg-blue-400 h-full rounded-full transition-all duration-300'
                                                        style={{ width: `${Math.round(progress * 100)}%` }}
                                                    />
                                                </div>
                                                <p className='text-xs mt-1 opacity-80'>
                                                    {Math.round(progress * 100)}%
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {!isProcessing && (
                                <div className='absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none'>
                                    <span className='opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-1 rounded-full text-sm font-medium shadow'>
                                        点击重新选择图片
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className='flex items-center justify-center gap-3'>
                            <Button onPress={handleProcess} isDisabled={isProcessing}>
                                🔒 混淆 / 反混淆
                            </Button>
                            <Button onPress={handleSave} isDisabled={isProcessing}>
                                💾 保存
                            </Button>
                            <Button variant='ghost' onPress={handleReselect} isDisabled={isProcessing}>
                                🔄 重选
                            </Button>
                        </div>

                        {blockInfo && (
                            <div className='text-center text-sm text-gray-500'>
                                区块大小: {blockInfo.blockSize}px · {blockInfo.cols}×{blockInfo.rows} 块
                            </div>
                        )}
                    </>
                )}

                {/* 算法描述 */}
                <CollapsibleSection title='📐 算法原理与数学推导'>
                    <h4 className='font-semibold text-gray-800'>1. Hilbert 空间填充曲线</h4>
                    <p>
                        Hilbert 曲线是一条连续的空间填充曲线，将一维索引 <code>d ∈ [0, N²)</code> 映射到二维坐标 <code>(x, y) ∈ [0, N)²</code>。
                        其关键性质是<strong>局部保持性</strong>：曲线上相邻的点在 2D 空间中也倾向于相邻。
                    </p>
                    <p>坐标转换公式（Skilling 算法）：</p>
                    <div className='bg-gray-50 rounded p-3 font-mono text-xs overflow-x-auto whitespace-pre-wrap'>
                        {`// 1D → 2D
for s = 1, 2, 4, ..., N/2:
  rx = (d >> 1) & 1
  ry = (d ^ rx) & 1
  (x, y) = rotate(s, x, y, rx, ry)
  x += s × rx
  y += s × ry
  d >>= 2

// 2D → 1D
for s = N/2, N/4, ..., 1:
  rx = (x & s) > 0 ? 1 : 0
  ry = (y & s) > 0 ? 1 : 0
  d += s² × ((3 × rx) ⊕ ry)
  (x, y) = rotate(s, x, y, rx, ry)`}
                    </div>

                    <h4 className='font-semibold text-gray-800'>2. 对合排列（Involutive Permutation）</h4>
                    <p>
                        排列 σ 满足 <code>σ(σ(i)) = i</code>，即执行两次等于恒等。
                        构造方法：先 Fisher-Yates 洗牌得到随机序列，再两两配对交换。
                    </p>
                    <div className='bg-gray-50 rounded p-3 font-mono text-xs overflow-x-auto whitespace-pre-wrap'>
                        {`// Fisher-Yates 洗牌
for i = n-1 downto 1:
  j = random(0, i)
  swap(available[i], available[j])

// 两两配对交换
for k = 0, 2, 4, ...:
  a = available[k]
  b = available[k+1]
  perm[a] = b
  perm[b] = a`}
                    </div>
                    <p>
                        正确性：每个交换 <code>(a b)</code> 满足 <code>(a b)(a b) = id</code>，
                        整个排列是不相交交换的组合，因此 <code>σ² = id</code>。
                    </p>

                    <h4 className='font-semibold text-gray-800'>3. 填充与裁剪</h4>
                    <p>
                        将图像填充到 128 的整数倍后处理，输出时裁剪回原始尺寸。
                        这确保所有像素都被完整块覆盖，没有未处理的边缘。
                    </p>
                    <p>
                        填充不改变原始像素（填黑色），裁剪去掉填充像素。
                        由于排列仅在原始像素范围内操作，填充区域的黑色像素不参与置换。
                    </p>

                    <h4 className='font-semibold text-gray-800'>4. 对合性证明</h4>
                    <p>设 <code>F</code> 为混淆函数，<code>F = crop ∘ obfuscatePadded ∘ pad</code>。</p>
                    <p>对合性要求 <code>F(F(x)) = x</code>：</p>
                    <ul className='list-disc list-inside space-y-1'>
                        <li><code>pad</code> 和 <code>crop</code> 互为逆操作</li>
                        <li><code>obfuscatePadded</code> 使用对合排列 σ，满足 <code>σ² = id</code></li>
                        <li>每个块独立处理，块间无依赖</li>
                        <li>排列仅在原始像素范围内操作，填充区域不参与</li>
                    </ul>
                    <p>
                        因此 <code>F(F(x)) = crop ∘ pad ∘ crop ∘ obfuscatePadded ∘ pad ∘ obfuscatePadded ∘ pad(x) = x</code>。 ∎
                    </p>

                    <h4 className='font-semibold text-gray-800'>5. 种子与确定性</h4>
                    <p>
                        种子计算：<code>seed = width × 114514 + height × 1919810</code>
                    </p>
                    <p>
                        每个块的子种子：<code>blockSeed = seed + bx × 7 + by × 13</code>
                    </p>
                    <p>
                        确定性保证：同尺寸图像的相同块总是使用相同的排列。不同尺寸产生不同的排列。
                    </p>
                </CollapsibleSection>

                {/* 设计取舍 */}
                <CollapsibleSection title='⚖️ 设计取舍'>
                    <div className='space-y-3'>
                        <div>
                            <h4 className='font-semibold text-gray-800'>为什么用 Hilbert 曲线？</h4>
                            <p>
                                Hilbert 曲线具有<strong>局部保持性</strong>：曲线上相邻的点在 2D 空间中也相邻。
                                这意味着混淆后的图像在视觉上呈现有机的流动扭曲效果，而非随机噪声。
                                相比之下，随机像素置换会产生类似电视雪花的无意义噪声。
                            </p>
                        </div>
                        <div>
                            <h4 className='font-semibold text-gray-800'>为什么用对合排列？</h4>
                            <p>
                                对合排列 <code>σ² = id</code> 使得混淆和反混淆使用<strong>完全相同的函数</strong>。
                                不需要单独实现反混淆逻辑，减少了代码量和出错概率。
                                用户只需对混淆图再次执行混淆即可还原。
                            </p>
                        </div>
                        <div>
                            <h4 className='font-semibold text-gray-800'>为什么分 128×128 块？</h4>
                            <p>
                                Hilbert 曲线要求块尺寸为 2 的幂。128 = 2⁷ 是合适的折中：
                                块足够大以产生明显的视觉混淆效果，又足够小使得每个块的排列生成开销可控（128² = 16384 个元素）。
                            </p>
                        </div>
                        <div>
                            <h4 className='font-semibold text-gray-800'>为什么不考虑裁剪后反混淆？</h4>
                            <p>
                                裁剪后反混淆需要知道裁剪偏移和原始尺寸。这些信息必须从混淆图中提取（标记像素）或由用户提供。
                                标记像素会污染混淆图的视觉效果，而依赖用户输入增加了使用复杂度。
                                实际场景中，裁剪混淆图的需求极少——用户通常要么保存整张混淆图，要么在混淆前先裁剪。
                            </p>
                        </div>
                        <div>
                            <h4 className='font-semibold text-gray-800'>为什么使用固定种子？</h4>
                            <p>
                                使用基于图像尺寸的确定性种子，保证同一张图每次混淆结果一致。
                                不依赖外部密钥，用户无需记忆或管理密码。
                                缺点是相同尺寸的不同图像使用相同的排列模式（但块内排列不同，因为像素值不同）。
                            </p>
                        </div>
                    </div>
                </CollapsibleSection>

                {/* 限制与特征 */}
                <CollapsibleSection title='📋 限制与特征'>
                    <div className='space-y-3'>
                        <div>
                            <h4 className='font-semibold text-gray-800'>✅ 特征</h4>
                            <ul className='list-disc list-inside space-y-1'>
                                <li>精确对合：混淆两次 = 还原原图（无信息损失）</li>
                                <li>所有像素都被混淆，包括图像边缘</li>
                                <li>色彩保留：块平均色彩不变，整体色调反映原图</li>
                                <li>Hilbert 曲线的局部保持性产生有机扭曲效果</li>
                                <li>处理速度快：纯像素位置置换，无复杂计算</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className='font-semibold text-gray-800'>⚠️ 限制</h4>
                            <ul className='list-disc list-inside space-y-1'>
                                <li>不支持裁剪后反混淆（需要原始尺寸和偏移信息）</li>
                                <li>不支持加密（算法目标是混淆，不是保密）</li>
                                <li>块边界可能产生轻微的视觉接缝</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className='font-semibold text-gray-800'>🛡️ 抗干扰能力</h4>
                            <ul className='list-disc list-inside space-y-1'>
                                <li><strong>PNG（无损）</strong>：完全无影响，精确还原</li>
                                <li><strong>JPEG Q90+</strong>：几乎完美还原</li>
                                <li><strong>JPEG Q80</strong>：轻微噪声，可接受</li>
                                <li><strong>JPEG Q60</strong>：明显噪声，原图可辨认</li>
                                <li><strong>WebP</strong>：同质量下优于 JPEG</li>
                                <li><strong>亮度/对比度调整</strong>：全局调整后仍可还原</li>
                                <li><strong>随机噪声</strong>：噪声被重新分布到全图，不被消除</li>
                                <li><strong>缩放/裁剪</strong>：不可逆（像素信息丢失）</li>
                            </ul>
                        </div>
                    </div>
                </CollapsibleSection>
            </div>
        </ToolLayout>
    );
}
