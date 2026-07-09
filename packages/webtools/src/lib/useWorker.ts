/**
 * 通用 Web Worker hook
 *
 * 封装 worker 的创建、消息通信和生命周期管理。
 * 将 worker 的 postMessage/promisify 化，并支持进度回调。
 * 支持 Transferable 对象转移所有权，避免数据复制。
 */
import { useRef, useEffect, useCallback } from 'react';

export interface WorkerMessage<T = unknown> {
    type: string;
    payload?: T;
    progress?: number;
    message?: string;
}

export interface UseWorkerReturn<TInput, TOutput> {
    /**
     * 向 worker 发送消息并等待结果
     * @param data - 发送的数据
     * @param onProgress - 进度回调 (0~1)
     * @param transferables - 可选的 Transferable 对象数组（如 ArrayBuffer），转移所有权避免复制
     */
    postMessage: (
        data: TInput,
        onProgress?: (progress: number) => void,
        transferables?: Transferable[],
    ) => Promise<TOutput>;
    /** 终止 worker */
    terminate: () => void;
}

/**
 * 创建并管理一个 Web Worker 实例。
 *
 * @param workerFactory - 创建 Worker 的工厂函数（避免 SSR 问题）
 * @returns postMessage / terminate 方法
 */
export function useWorker<TInput, TOutput>(
    workerFactory: () => Worker,
): UseWorkerReturn<TInput, TOutput> {
    const workerRef = useRef<Worker | null>(null);

    // 组件卸载时终止 worker
    useEffect(() => {
        return () => {
            workerRef.current?.terminate();
            workerRef.current = null;
        };
    }, []);

    const terminate = useCallback(() => {
        workerRef.current?.terminate();
        workerRef.current = null;
    }, []);

    const postMessage = useCallback(
        (
            data: TInput,
            onProgress?: (progress: number) => void,
            transferables?: Transferable[],
        ): Promise<TOutput> => {
            return new Promise<TOutput>((resolve, reject) => {
                // 每次调用创建新 worker，确保干净状态
                workerRef.current?.terminate();
                const worker = workerFactory();
                workerRef.current = worker;

                worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
                    const msg = e.data;
                    switch (msg.type) {
                        case 'progress':
                            onProgress?.(msg.progress ?? 0);
                            break;
                        case 'done':
                            worker.terminate();
                            workerRef.current = null;
                            resolve(msg.payload as TOutput);
                            break;
                        case 'error':
                            worker.terminate();
                            workerRef.current = null;
                            reject(new Error(msg.message ?? 'Worker error'));
                            break;
                    }
                };

                worker.onerror = (e) => {
                    worker.terminate();
                    workerRef.current = null;
                    reject(new Error(e.message ?? 'Worker error'));
                };

                // 使用 Transferable 转移所有权，避免 structured clone 复制
                worker.postMessage(
                    { type: 'process', payload: data },
                    transferables ?? [],
                );
            });
        },
        [workerFactory],
    );

    return { postMessage, terminate };
}
