import { describe, expect, it, vi } from 'vitest';

import { playConfiguredLive2dMotion } from './live2d-motion';

describe('playConfiguredLive2dMotion', () => {
    it('calls the real motion API with a configured group and index', () => {
        const player = {
            getMotions: vi.fn(() => ({ TapBody: ['idle.motion3.json', 'wave.motion3.json'] })),
            playMotion: vi.fn(),
        };

        const result = playConfiguredLive2dMotion(player, {
            group: 'TapBody',
            index: 1,
            priority: 3,
        });

        expect(player.getMotions).toHaveBeenCalledOnce();
        expect(player.playMotion).toHaveBeenCalledWith('TapBody', 1, 3);
        expect(result).toMatchObject({ status: 'played', usedFallback: false });
    });

    it('falls back to an available random motion when saved settings do not fit the model', () => {
        const player = {
            getMotions: vi.fn(() => ({ Idle: ['idle.motion3.json'] })),
            playMotion: vi.fn(),
        };

        const result = playConfiguredLive2dMotion(player, {
            group: 'MissingGroup',
            index: 8,
            priority: 2,
        });

        expect(player.playMotion).toHaveBeenCalledWith('Idle', undefined, 2);
        expect(result).toMatchObject({ status: 'played', group: 'Idle', usedFallback: true });
    });

    it('does not fake playback when the model exposes no motions', () => {
        const player = {
            getMotions: vi.fn(() => ({})),
            playMotion: vi.fn(),
        };

        const result = playConfiguredLive2dMotion(player, {
            group: '',
            index: -1,
            priority: 2,
        });

        expect(player.playMotion).not.toHaveBeenCalled();
        expect(result).toEqual({ status: 'unavailable', message: '当前模型没有可播放的动作。' });
    });
});
