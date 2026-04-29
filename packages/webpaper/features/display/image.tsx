import React from 'react';
import { Alert } from 'antd';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { useMouse } from '@reactuses/core';

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
    const [backgroundSrc, setBackgroundSrc] = useState<string>('');
    const [foregroundSrc, setForegroundSrc] = useState<string>('');
    const loadTokenRef = useRef(0);
    const allSyncPendingRef = useRef<AllSyncPending | null>(null);
    const onImageErrorRef = useRef(onImageError);
    const mouse = useMouse();

    useEffect(() => {
        onImageErrorRef.current = onImageError;
    }, [onImageError]);

    const offsetX = (() => {
        if (!enableMouseTracking || !Number.isFinite(mouse.clientX) || typeof window === 'undefined') {
            return 0;
        }

        return (mouse.clientX / Math.max(window.innerWidth, 1) - 0.5) * trackIntensity;
    })();
    const offsetY = (() => {
        if (!enableMouseTracking || !Number.isFinite(mouse.clientY) || typeof window === 'undefined') {
            return 0;
        }

        return (mouse.clientY / Math.max(window.innerHeight, 1) - 0.5) * trackIntensity;
    })();

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
        <div className='select-none'>
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
        </div>
    );
}