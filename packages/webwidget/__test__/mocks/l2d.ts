export type L2D = {
    load: (options: { path: string }) => Promise<void>;
    setScale: (scale: number) => void;
    destroy?: () => void;
    resize?: () => void;
    on?: (event: string, handler: (areas: string[]) => void) => void;
};

function createL2DInstance(): L2D {
    return {
        async load() {
            return;
        },
        setScale() {
            return;
        },
        destroy() {
            return;
        },
        resize() {
            return;
        },
        on() {
            return;
        },
    };
}

export function init(_canvas: HTMLCanvasElement): L2D {
    return createL2DInstance();
}
