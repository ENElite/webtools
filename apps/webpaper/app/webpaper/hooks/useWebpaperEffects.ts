import { useEffect } from 'react';
import { useWakeLock } from '@reactuses/core';
import { usePaperStore, useRecordStore } from '@/store';
import { usePreloadImage } from '@webtools/shared/hooks';

export function useWebpaperEffects() {
    const sharedSettings = usePaperStore((state) => state.sharedSettings);
    const enableAutoPlay = useRecordStore((state) => state.enableAutoPlay);
    const disableAutoPlay = useRecordStore((state) => state.disableAutoPlay);
    const isAutoPlaying = useRecordStore((state) => state.autoPlay !== 'stop');
    const pendingPreloadUrl = useRecordStore((state) => state.pendingPreloadUrl);

    const {
        isActive: wakeLockActive,
        request: requestWakeLock,
        release: releaseWakeLock,
        isSupported: wakeLockSupported,
    } = useWakeLock();

    usePreloadImage(pendingPreloadUrl);

    // Wake lock management
    useEffect(() => {
        if (!wakeLockSupported) {
            return;
        }

        if (sharedSettings.enableWakeLock && !wakeLockActive) {
            void requestWakeLock();
        } else if (!sharedSettings.enableWakeLock && wakeLockActive) {
            void releaseWakeLock();
        }
    }, [sharedSettings.enableWakeLock, wakeLockActive, wakeLockSupported, requestWakeLock, releaseWakeLock]);

    // Auto-play enable/disable
    useEffect(() => {
        if (!isAutoPlaying) {
            return;
        }

        enableAutoPlay(sharedSettings.interval);
    }, [enableAutoPlay, isAutoPlaying, sharedSettings.interval]);

    // Auto-play cleanup
    useEffect(() => {
        return () => {
            disableAutoPlay();
        };
    }, [disableAutoPlay]);
}
