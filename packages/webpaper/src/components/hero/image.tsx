import { Alert } from 'antd';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';

export type ImageHeroMode = 'imageOnly' | 'imageAsync' | 'allAsync' | 'previewAsync' | 'allSync';

type AllSyncPending = {
    token: number;
    backgroundUrl: string;
    foregroundUrl: string;
};

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

function normalizeUrl(url: string): string {
    try {
        const base = typeof window !== 'undefined' ? window.location.href : 'http://localhost/';
        return new URL(url, base).href;
    } catch {
        return url;
    }
}

type ImageHeroProps = {
    imageUrl: string;
    previewUrl?: string | null;
    mode: ImageHeroMode;
    objectFit: 'contain' | 'cover';
    trackScale: number;
    trackIntensity: number;
    enableMouseTracking: boolean;
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
    objectFit,
    trackScale,
    trackIntensity,
    enableMouseTracking,
    onImageError,
}: ImageHeroProps) {
    const [mouseRatio, setMouseRatio] = useState({ x: 0, y: 0 });
    const [backgroundSrc, setBackgroundSrc] = useState<string>('');
    const [foregroundSrc, setForegroundSrc] = useState<string>('');
    const loadTokenRef = useRef(0);
    const allSyncPendingRef = useRef<AllSyncPending | null>(null);
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
            setForegroundSrc('');
            allSyncPendingRef.current = null;
            return;
        }

        loadTokenRef.current += 1;
        const token = loadTokenRef.current;
        allSyncPendingRef.current = null;
        const backgroundUrl = resolvePreviewUrl(previewUrl, imageUrl);

        // Keep background during previewAsync to avoid flash, clear in other modes.
        if (mode !== 'previewAsync') {
            setBackgroundSrc('');
        }
        setForegroundSrc('');

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
            });
            return;
        }

        if (mode === 'imageAsync') {
            setForegroundSrc('');

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
            });
            return;
        }

        // mode === 'allSync'
        void Promise.resolve().then(() => {
            if (loadTokenRef.current !== token) {
                return;
            }

            setBackgroundSrc(backgroundUrl);
            allSyncPendingRef.current = {
                token,
                backgroundUrl,
                foregroundUrl: imageUrl,
            };
        });

        void loadImage(imageUrl);
    }, [imageUrl, mode, previewUrl]);

    if (!imageUrl) {
        return (
            <section className='absolute left-4 top-4' style={{ width: 'min(720px, calc(100% - 2rem))' }}>
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
                className='absolute inset-0 h-full w-full object-cover'
                alt='preview'
                referrerPolicy='no-referrer'
                onLoad={(event: SyntheticEvent<HTMLImageElement>) => {
                    if (mode !== 'allSync') {
                        return;
                    }

                    const pending = allSyncPendingRef.current;
                    if (!pending || pending.token !== loadTokenRef.current) {
                        return;
                    }

                    const loadedUrl = normalizeUrl(event.currentTarget.currentSrc || event.currentTarget.src || '');
                    const expectedUrl = normalizeUrl(pending.backgroundUrl);
                    if (loadedUrl !== expectedUrl) {
                        return;
                    }

                    allSyncPendingRef.current = null;
                    setForegroundSrc(pending.foregroundUrl);
                }}
                onError={() => {
                    if (mode !== 'allSync') {
                        return;
                    }

                    const pending = allSyncPendingRef.current;
                    if (!pending || pending.token !== loadTokenRef.current) {
                        return;
                    }

                    allSyncPendingRef.current = null;
                    onImageErrorRef.current();
                }}
            />
            <div className='absolute inset-0 backdrop-blur-[18px]' />
            {foregroundSrc
                ? (
                    <img
                        src={foregroundSrc}
                        className={`absolute inset-0 h-full w-full object-center drop-shadow-[0_6px_20px_rgba(0,0,0,0.38)]`}
                        style={{
                            objectFit,
                            transform: `scale(${trackScale / 100}) translate(${offsetX}%, ${offsetY}%)`,
                        }}
                        alt='image'
                        referrerPolicy='no-referrer'
                        onError={() => onImageErrorRef.current()}
                    />
                )
                : null}
        </>
    );
}
