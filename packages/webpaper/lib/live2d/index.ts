const LIVE2D_ASSET_BASE_PATH = '/live2d';

export const LIVE2D_CUBISM_CORE_SCRIPT = `${LIVE2D_ASSET_BASE_PATH}/live2dcubismcore.min.js`;
export const DEFAULT_LIVE2D_MODEL3_PATH = `${LIVE2D_ASSET_BASE_PATH}/assets/hiyori/runtime/hiyori_free_t08.model3.json`;

const LIVE2D_LOG_PREFIX = '[Live2D:lib]';

type PixiModule = typeof import('pixi.js');
type CubismModule = typeof import('pixi-live2d-display/cubism4');

declare global {
    interface Window {
        PIXI?: unknown;
        Live2DCubismCore?: unknown;
    }
}

function isAbsoluteUrl(value: string): boolean {
    return /^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith('data:');
}

export function resolveLive2dModelPath(modelPath: string): string {
    const normalizedPath = modelPath.trim();

    if (normalizedPath.length === 0) {
        return DEFAULT_LIVE2D_MODEL3_PATH;
    }

    if (isAbsoluteUrl(normalizedPath) || normalizedPath.startsWith('/')) {
        return normalizedPath;
    }

    return /\.(can3|cmo3)$/i.test(normalizedPath) ? DEFAULT_LIVE2D_MODEL3_PATH : normalizedPath;
}

const live2dRuntimePromiseMap = new Map<string, Promise<void>>();
let pixiModulePromise: Promise<PixiModule> | null = null;
let cubismModulePromise: Promise<CubismModule> | null = null;

function loadScript(src: string, readyCheck: () => boolean): Promise<void> {
    if (typeof document === 'undefined') {
        return Promise.resolve();
    }

    if (readyCheck()) {
        console.info(`${LIVE2D_LOG_PREFIX} runtime already ready`, { src });
        return Promise.resolve();
    }

    const existingPromise = live2dRuntimePromiseMap.get(src);
    if (existingPromise) {
        return existingPromise;
    }

    const loadPromise = new Promise<void>((resolve, reject) => {
        const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);

        if (existingScript) {
            console.info(`${LIVE2D_LOG_PREFIX} reusing existing script tag`, { src });
            existingScript.addEventListener('load', () => resolve(), { once: true });
            existingScript.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), { once: true });
            return;
        }

        console.info(`${LIVE2D_LOG_PREFIX} injecting script`, { src });
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => {
            console.info(`${LIVE2D_LOG_PREFIX} script loaded`, { src });
            resolve();
        };
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });

    live2dRuntimePromiseMap.set(src, loadPromise);
    loadPromise.catch(() => {
        live2dRuntimePromiseMap.delete(src);
    });

    return loadPromise;
}

export async function ensureLive2dRuntimeLoaded(): Promise<void> {
    if (typeof window === 'undefined') {
        return;
    }

    // console.info(`${LIVE2D_LOG_PREFIX} ensure runtime start`);
    await loadScript(
        LIVE2D_CUBISM_CORE_SCRIPT,
        () => typeof window.Live2DCubismCore !== 'undefined'
    );

}

export async function loadPixiModule(): Promise<PixiModule> {
    if (!pixiModulePromise) {
        pixiModulePromise = import('pixi.js');
    }

    return pixiModulePromise;
}

export async function loadCubism4Module(): Promise<CubismModule> {
    await ensureLive2dRuntimeLoaded();

    if (!cubismModulePromise) {
        cubismModulePromise = import('pixi-live2d-display/cubism4');
    }

    return cubismModulePromise;
}

export async function loadLive2dRuntimeModules(): Promise<{
    pixi: PixiModule;
    cubism: CubismModule;
}> {
    const [pixi, cubism] = await Promise.all([
        loadPixiModule(),
        loadCubism4Module(),
    ]);

    return { pixi, cubism };
}

export async function preloadLive2dResources(modelPath = DEFAULT_LIVE2D_MODEL3_PATH): Promise<void> {
    if (typeof window === 'undefined') {
        return;
    }

    const resolvedModelPath = resolveLive2dModelPath(modelPath);
    await ensureLive2dRuntimeLoaded();

    const response = await fetch(resolvedModelPath, { cache: 'force-cache' });
    if (!response.ok) {
        throw new Error(`Failed to preload Live2D model: ${response.status} ${response.statusText}`);
    }
}

export async function loadLive2dSettingsJson(modelPath: string): Promise<Record<string, unknown>> {
    await ensureLive2dRuntimeLoaded();

    const resolvedModelPath = resolveLive2dModelPath(modelPath);
    const response = await fetch(resolvedModelPath);
    if (!response.ok) {
        throw new Error(`Failed to fetch Live2D settings: ${response.status} ${response.statusText}`);
    }

    const settingsJson = await response.json();
    settingsJson['url'] = resolvedModelPath;
    console.info(`${LIVE2D_LOG_PREFIX} load settings done`, {
        resolvedModelPath,
        status: response.status,
        topLevelKeys: Object.keys(settingsJson),
    });
    return settingsJson;
}

const settingsJsonCache = new Map<string, Promise<Record<string, unknown>>>();

export async function loadLive2dSettingsJsonCached(modelPath: string): Promise<Record<string, unknown>> {
    const resolvedModelPath = resolveLive2dModelPath(modelPath);
    const existing = settingsJsonCache.get(resolvedModelPath);
    if (existing) {
        console.info(`${LIVE2D_LOG_PREFIX} returning cached settingsJson`, { resolvedModelPath });
        return existing;
    }

    const promise = (async () => {
        const result = await loadLive2dSettingsJson(modelPath);
        return result;
    })();

    settingsJsonCache.set(resolvedModelPath, promise);
    promise.catch(() => settingsJsonCache.delete(resolvedModelPath));
    return promise;
}