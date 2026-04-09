import { Alert, Space, Tag } from 'antd';
import { useEffect, useRef, useState } from 'react';

export type ImageHeroMode = 'imageOnly' | 'imageAsync' | 'allAsync' | 'previewAsync' | 'allSync';

function resolvePreviewUrl(previewUrl: string | null | undefined, imageUrl: string): string {
    if (!previewUrl) {
        return imageUrl;
    }

    const candidate = previewUrl.trim();
    if (!candidate) {
        return imageUrl;
    }

    try {
        const base = typeof window !== 'undefined' ? window.location.href : 'http://localhost/';
        // Use URL parsing to guard against malformed preview urls.
        // Relative urls are allowed and resolved against current location.
        void new URL(candidate, base);
        return candidate;
    } catch {
        return imageUrl;
    }
}

type ImageHeroProps = {
    imageUrl: string;
    previewUrl?: string | null;
    mode: ImageHeroMode;
    id: number | string;
    provider: string;
    objectFit: 'contain' | 'cover';
    trackScale: number;
    trackIntensity: number;
    enableMouseTracking: boolean;
    now: { time: string; date: string; day: string };
    onImageError: () => void;
};

// 将 previewUrl 和 imageUrl 和展示效果分离，单独传入 mode 参数 作为情形处理，需要考虑下面情形的处理：
// mode === 'imageOnly'. 立即刷新前台和背景 img 将二者都设置为 imageUrl，等待浏览器自然加载。
// mode === 'imageAsync'. 异步加载前台 img, 加载成功后 将前台和背景 img 都设置为 imageUrl.
// mode === 'allAsync'. 异步加载前台和背景 img, 每个 img onload 成功后再刷新对应的 img.
// mode === 'previewAsync'. 异步加载 背景和前台 img, 等待背景 img 加载完成后，再刷新背景和前台的 img, 无论 前台 img 是否加载成功。
// mode === 'allSync'. 立即刷新 背景 img 设置为 previewUrl. 清空前台 img 并异步加载 imageUrl, 等待背景 img onLoad 成功后，无论imageUrl加载成功与否，立即刷新前台 img 为 imageUrl.
// mode 会发生切换，切换时立即生效

export function ImageHero({
    imageUrl,
    previewUrl,
    mode,
    id,
    provider,
    objectFit,
    trackScale,
    trackIntensity,
    enableMouseTracking,
    now,
    onImageError,
}: ImageHeroProps) {
    const [mouseRatio, setMouseRatio] = useState({ x: 0, y: 0 });
    const [backgroundSrc, setBackgroundSrc] = useState<string>('');
    const [foregroundSrc, setForegroundSrc] = useState<string | null>(null);
    const [foregroundVisible, setForegroundVisible] = useState(false);
    const loadTokenRef = useRef(0);
    const allSyncPendingTokenRef = useRef<number | null>(null);
    const onImageErrorRef = useRef(onImageError);

    useEffect(() => {
        onImageErrorRef.current = onImageError;
    }, [onImageError]);

    useEffect(() => {
        if (!enableMouseTracking) {
            setMouseRatio({ x: 0, y: 0 });
            return;
        }

        const onMouseMove = (event: MouseEvent) => {
            const x = event.clientX / Math.max(window.innerWidth, 1) - 0.5;
            const y = event.clientY / Math.max(window.innerHeight, 1) - 0.5;
            setMouseRatio({ x, y });
        };

        window.addEventListener('mousemove', onMouseMove, { passive: true });
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
        };
    }, [enableMouseTracking]);

    const offsetX = enableMouseTracking ? mouseRatio.x * trackIntensity : 0;
    const offsetY = enableMouseTracking ? mouseRatio.y * trackIntensity : 0;

    useEffect(() => {
        if (!imageUrl) {
            setBackgroundSrc('');
            setForegroundSrc(null);
            setForegroundVisible(false);
            allSyncPendingTokenRef.current = null;
            return;
        }

        loadTokenRef.current += 1;
        const token = loadTokenRef.current;
        allSyncPendingTokenRef.current = null;
        const backgroundUrl = resolvePreviewUrl(previewUrl, imageUrl);

        // Keep background during previewAsync to avoid flash, clear in other modes.
        if (mode !== 'previewAsync') {
            setBackgroundSrc('');
        }
        setForegroundSrc(null);
        setForegroundVisible(false);

        const loadImage = (url: string): Promise<boolean> => {
            return new Promise((resolve) => {
                const image = new Image();
                image.referrerPolicy = 'no-referrer';
                image.decoding = 'async';
                image.onload = () => resolve(true);
                image.onerror = () => resolve(false);
                image.src = url;
            });
        };

        if (mode === 'imageOnly') {
            void Promise.resolve().then(() => {
                if (loadTokenRef.current !== token) {
                    return;
                }

                setBackgroundSrc(imageUrl);
                setForegroundSrc(imageUrl);
                setForegroundVisible(true);
            });
            return;
        }

        if (mode === 'imageAsync') {
            setForegroundVisible(false);

            void loadImage(imageUrl).then((loaded) => {
                if (loadTokenRef.current !== token) {
                    return;
                }

                if (!loaded) {
                    onImageErrorRef.current();
                    return;
                }

                setBackgroundSrc(imageUrl);
                setForegroundSrc(imageUrl);
                setForegroundVisible(true);
            });

            return;
        }

        if (mode === 'allAsync') {
            void loadImage(backgroundUrl).then((loaded) => {
                if (loadTokenRef.current !== token || !loaded) {
                    return;
                }

                setBackgroundSrc(backgroundUrl);
            });

            void loadImage(imageUrl).then((loaded) => {
                if (loadTokenRef.current !== token) {
                    return;
                }

                if (!loaded) {
                    onImageErrorRef.current();
                    return;
                }

                setForegroundSrc(imageUrl);
                setForegroundVisible(true);
            });
            return;
        }

        if (mode === 'previewAsync') {
            void loadImage(imageUrl);
            void loadImage(backgroundUrl).then((loaded) => {
                if (loadTokenRef.current !== token) {
                    return;
                }

                if (!loaded) {
                    onImageErrorRef.current();
                    return;
                }

                setBackgroundSrc(backgroundUrl);
                setForegroundSrc(imageUrl);
                setForegroundVisible(true);
            });
            return;
        }

        // mode === 'allSync'
        void Promise.resolve().then(() => {
            if (loadTokenRef.current !== token) {
                return;
            }

            setBackgroundSrc(backgroundUrl);
            allSyncPendingTokenRef.current = token;
        });

        void loadImage(imageUrl);
    }, [imageUrl, mode, previewUrl]);

    if (!imageUrl) {
        return (
            <section className='absolute left-4 top-4 z-[6]' style={{ width: 'min(720px, calc(100% - 2rem))' }}>
                <Alert
                    title='正在拉取图片'
                    description='如果请求失败，请在设置里切换 API 地址，或者调整 provider 的筛选条件。'
                    type='info'
                    showIcon
                />
            </section>
        );
    }

    return (
        <>
            <img
                src={backgroundSrc || undefined}
                className='absolute inset-0 z-0 h-full w-full object-cover'
                alt='preview'
                referrerPolicy='no-referrer'
                onLoad={() => {
                    if (mode !== 'allSync') {
                        return;
                    }

                    const pendingToken = allSyncPendingTokenRef.current;
                    if (pendingToken === null || pendingToken !== loadTokenRef.current) {
                        return;
                    }

                    allSyncPendingTokenRef.current = null;
                    setForegroundSrc(imageUrl);
                    setForegroundVisible(true);
                }}
                onError={() => {
                    if (mode !== 'allSync') {
                        return;
                    }

                    const pendingToken = allSyncPendingTokenRef.current;
                    if (pendingToken === null || pendingToken !== loadTokenRef.current) {
                        return;
                    }

                    allSyncPendingTokenRef.current = null;
                    onImageErrorRef.current();
                }}
            />
            <div className='absolute inset-0 z-[1] backdrop-blur-[18px]' />
            <img
                src={foregroundSrc ?? undefined}
                className={`absolute inset-0 z-[2] h-full w-full object-center drop-shadow-[0_6px_20px_rgba(0,0,0,0.38)] transition-opacity duration-150 ease-out ${foregroundVisible ? 'opacity-100' : 'opacity-0'}`}
                style={{
                    objectFit,
                    transform: `scale(${trackScale / 100}) translate(${offsetX}%, ${offsetY}%)`,
                }}
                alt={`konachan-${id}`}
                referrerPolicy='no-referrer'
                onError={() => onImageErrorRef.current()}
            />

            <div className='absolute bottom-[6.5rem] left-4 z-[4] flex flex-col gap-[0.1rem] text-white md:left-[clamp(1rem,12vw,10rem)] md:bottom-[clamp(4.5rem,12vh,7rem)] [text-shadow:0_0_14px_rgba(0,0,0,0.8)]'>
                <span className='text-[clamp(2.1rem,7vw,4rem)] font-bold tracking-[0.04em]'>{now.time}</span>
                <span className='text-[clamp(1rem,2.2vw,1.35rem)] font-semibold'>
                    {now.date} {now.day}
                </span>
                <Space size={8} wrap>
                    <Tag color='blue'>{provider}</Tag>
                    <Tag>ID {id}</Tag>
                </Space>
            </div>
        </>
    );
}
