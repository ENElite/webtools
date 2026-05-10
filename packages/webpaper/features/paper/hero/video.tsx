import { Alert } from 'antd';

import { useEffect, useRef, useState } from 'react';

type VideoHeroProps = {
    videoUrl: string;
    posterUrl?: string | null;
    objectFit: 'contain' | 'cover';
    onVideoError: () => void;
    onVideoEnded: () => void;
};

export function VideoHero({
    videoUrl,
    posterUrl,
    objectFit,
    onVideoError,
    onVideoEnded,
}: VideoHeroProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        setReady(false);
    }, [videoUrl]);

    if (!videoUrl) {
        return (
            <section className='absolute left-4 top-4 z-6' style={{ width: 'min(720px, calc(100% - 2rem))' }}>
                <Alert
                    title='正在拉取视频'
                    description='如果请求失败，请在设置里切换数据源或调整筛选条件。'
                    type='info'
                    showIcon
                />
            </section>
        );
    }

    return (
        <>
            <img
                src={posterUrl || undefined}
                className='absolute inset-0 z-0 h-full w-full object-cover'
                alt='video-poster'
                referrerPolicy='no-referrer'
            />
            <div className='absolute inset-0 z-1 backdrop-blur-[18px]' />

            <video
                key={videoUrl}
                ref={videoRef}
                src={videoUrl}
                poster={posterUrl || undefined}
                className={`absolute inset-0 z-2 h-full w-full object-center drop-shadow-[0_6px_20px_rgba(0,0,0,0.38)] transition-opacity duration-200 ${ready ? 'opacity-100' : 'opacity-0'}`}
                style={{ objectFit }}
                autoPlay
                muted
                playsInline
                controls
                preload='auto'
                onCanPlay={() => setReady(true)}
                onError={onVideoError}
                onEnded={onVideoEnded}
            />
        </>
    );
}