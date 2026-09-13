export interface Live2dMotionPlayer {
    getMotions(): Record<string, string[]>;
    playMotion(group: string, index?: number, priority?: number): void;
}

export type Live2dClickMotionSettings = {
    readonly group: string;
    readonly index: number;
    readonly priority: number;
};

export type Live2dMotionResult =
    | {
        readonly status: 'played';
        readonly group: string;
        readonly index: number | undefined;
        readonly usedFallback: boolean;
        readonly message: string;
    }
    | { readonly status: 'unavailable' | 'error'; readonly message: string };

/** Resolve against the model at click time because motion groups vary by model. */
export function playConfiguredLive2dMotion(
    player: Live2dMotionPlayer,
    settings: Live2dClickMotionSettings,
): Live2dMotionResult {
    try {
        const groups = Object.entries(player.getMotions())
            .filter((entry): entry is [string, string[]] => entry[1].length > 0);
        if (groups.length === 0) {
            return { status: 'unavailable', message: '当前模型没有可播放的动作。' };
        }

        const configured = settings.group
            ? groups.find(([group]) => group === settings.group)
            : undefined;
        const [group, files] = configured ?? groups[0]!;
        const requestedIndex = settings.index;
        const index = requestedIndex >= 0 && requestedIndex < files.length
            ? requestedIndex
            : undefined;
        const usedFallback = Boolean(settings.group && !configured)
            || (requestedIndex >= 0 && index === undefined);

        player.playMotion(group, index, settings.priority);
        return {
            status: 'played',
            group,
            index,
            usedFallback,
            message: usedFallback
                ? `指定动作不可用，已播放 ${group} 的随机动作。`
                : `正在播放 ${group}${index === undefined ? ' 的随机动作' : ` #${index}` }。`,
        };
    } catch (error: unknown) {
        return {
            status: 'error',
            message: error instanceof Error ? error.message : 'Live2D 动作播放失败。',
        };
    }
}
