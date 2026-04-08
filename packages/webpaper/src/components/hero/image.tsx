import { Alert, Space, Tag } from 'antd';
import { useEffect, useRef, useState } from 'react';


type ImageHeroProps = {
    imageUrl: string;
    previewUrl?: string | null;
    id: number | string;
    provider: string;
    objectFit: 'contain' | 'cover';
    trackScale: number;
    trackIntensity: number;
    enableMouseTracking: boolean;
    now: { time: string; date: string; day: string };
    onImageError: () => void;
};

export function ImageHero({
    imageUrl,
    previewUrl,
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
    const [foregroundSrc, setForegroundSrc] = useState<string>('');
    const [foregroundVisible, setForegroundVisible] = useState(false);
    const loadTokenRef = useRef(0);

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
            setForegroundVisible(false);
            return;
        }

        loadTokenRef.current += 1;
        const token = loadTokenRef.current;

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

        if (!previewUrl) {
            setForegroundVisible(false);

            void loadImage(imageUrl).then((loaded) => {
                if (loadTokenRef.current !== token) {
                    return;
                }

                if (!loaded) {
                    onImageError();
                    return;
                }

                setBackgroundSrc(imageUrl);
                setForegroundSrc(imageUrl);
                setForegroundVisible(true);
            });

            return;
        }

        const previewLoad = loadImage(previewUrl);
        const mainLoad = loadImage(imageUrl);

        void previewLoad.then((loaded) => {
            if (loadTokenRef.current !== token || !loaded) {
                return;
            }

            // Preview is ready first: refresh background immediately and hide previous foreground.
            setBackgroundSrc(previewUrl);
            setForegroundVisible(false);
        });

        void mainLoad.then((loaded) => {
            if (loadTokenRef.current !== token) {
                return;
            }

            if (!loaded) {
                onImageError();
                return;
            }

            setForegroundSrc(imageUrl);
            setForegroundVisible(true);
        });
    }, [imageUrl, onImageError, previewUrl]);

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
            />
            <div className='absolute inset-0 z-[1] backdrop-blur-[18px]' />
            <img
                src={foregroundSrc || undefined}
                className={`absolute inset-0 z-[2] h-full w-full object-center drop-shadow-[0_6px_20px_rgba(0,0,0,0.38)] transition-all duration-150 ease-out ${foregroundVisible ? 'opacity-100' : 'opacity-0'}`}
                style={{
                    objectFit,
                    transform: `scale(${trackScale / 100}) translate(${offsetX}%, ${offsetY}%)`,
                }}
                alt={`konachan-${id}`}
                referrerPolicy='no-referrer'
                onError={onImageError}
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
