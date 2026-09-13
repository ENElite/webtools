/**
 * FFmpeg Hook
 *
 * 使用官方 Worker 脚本（从 public/ffmpeg/ 加载）加载 ffmpeg-core，
 * 通过 classWorkerURL 将其注入 FFmpeg 类。
 */
'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';

export interface UseFFmpegReturn {
    isLoaded: boolean;
    isExecuting: boolean;
    progress: number;
    progressMessage: string;
    logs: string[];
    load: () => Promise<void>;
    exec: (
        command: string,
        inputData: Uint8Array,
        inputName: string,
        outputName: string,
    ) => Promise<Uint8Array>;
    cleanup: () => Promise<void>;
    clearLogs: () => void;
}

export function useFFmpeg(): UseFFmpegReturn {
    const ffmpegRef = useRef<FFmpeg | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        ffmpegRef.current = new FFmpeg();
        return () => {
            ffmpegRef.current?.terminate();
            ffmpegRef.current = null;
        };
    }, []);

    // ── 加载 ──────────────────────────────────────────

    const load = useCallback(async () => {
        const ffmpeg = ffmpegRef.current;
        if (!ffmpeg) throw new Error('FFmpeg 未初始化');

        setProgressMessage('正在加载 FFmpeg...');
        setProgress(0);

        const onLog = ({ message }: { message: string }) => {
            setLogs((prev) => [...prev, message]);
        };
        const onProgress = ({ progress: p }: { progress: number }) => {
            const clamped = Math.max(0, Math.min(1, p));
            setProgress(clamped);
            if (clamped < 0.3) {
                setProgressMessage(`正在下载核心模块... ${Math.round(clamped * 100)}%`);
            } else if (clamped < 0.9) {
                setProgressMessage(`正在编译 WASM... ${Math.round(clamped * 100)}%`);
            } else {
                setProgressMessage(`正在初始化... ${Math.round(clamped * 100)}%`);
            }
        };

        ffmpeg.on('log', onLog);
        ffmpeg.on('progress', onProgress);

        try {
            // 从 public/ 加载自定义 Worker 脚本，转为 Blob URL
            // 这样 FFmpeg 库创建的是 classic worker，走 importScripts() 路径
            const workerResp = await fetch('/ffmpeg/worker.js');
            const workerCode = await workerResp.text();
            const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(workerBlob);

            try {
                await ffmpeg.load({ classWorkerURL: workerUrl });
            } finally {
                URL.revokeObjectURL(workerUrl);
            }

            setIsLoaded(true);
            setProgress(1);
            setProgressMessage('FFmpeg 加载完成');
        } finally {
            ffmpeg.off('log', onLog);
            ffmpeg.off('progress', onProgress);
        }
    }, []);

    // ── 执行命令 ──────────────────────────────────────

    const exec = useCallback(async (
        command: string,
        inputData: Uint8Array,
        inputName: string,
        outputName: string,
    ): Promise<Uint8Array> => {
        const ffmpeg = ffmpegRef.current;
        if (!ffmpeg) throw new Error('FFmpeg 未初始化');

        setIsExecuting(true);
        setProgress(0);
        setProgressMessage('正在写入文件...');

        try {
            await ffmpeg.writeFile(inputName, inputData);

            const args = modifyCommand(command, inputName, outputName);

            const onProgress = ({ progress: p, time }: { progress: number; time: number }) => {
                setProgress(p);
                setProgressMessage(`处理中... ${Math.round(p * 100)}% (time=${time})`);
            };
            const onLog = ({ message }: { message: string }) => {
                setLogs((prev) => [...prev, message]);
            };

            ffmpeg.on('progress', onProgress);
            ffmpeg.on('log', onLog);

            try {
                setProgressMessage('正在执行命令...');
                const exitCode = await ffmpeg.exec(args);

                if (exitCode !== 0) {
                    throw new Error(`FFmpeg 命令执行失败 (exit code: ${exitCode})`);
                }
            } finally {
                ffmpeg.off('progress', onProgress);
                ffmpeg.off('log', onLog);
            }

            setProgressMessage('正在读取结果...');
            const outputData = await ffmpeg.readFile(outputName);

            let result: Uint8Array;
            if (outputData instanceof Uint8Array) {
                result = new Uint8Array(outputData);
            } else if (typeof outputData === 'string') {
                result = new TextEncoder().encode(outputData);
            } else {
                result = new Uint8Array(outputData as ArrayBuffer);
            }

            try {
                await ffmpeg.deleteFile(inputName);
                await ffmpeg.deleteFile(outputName);
            } catch {
                // 忽略清理错误
            }

            setProgress(1);
            setProgressMessage('处理完成');
            return result;
        } finally {
            setIsExecuting(false);
        }
    }, []);

    // ── 清理 ──────────────────────────────────────────

    const cleanup = useCallback(async () => {
        const ffmpeg = ffmpegRef.current;
        if (!ffmpeg) return;
        try {
            const files = await ffmpeg.listDir('/');
            for (const file of files) {
                if (file.name === '.' || file.name === '..') continue;
                try {
                    await ffmpeg.deleteFile(`/${file.name}`);
                } catch {
                    // A stale virtual file should not prevent the remaining cleanup.
                }
            }
        } catch {
            // FFmpeg may already be terminated or its virtual FS unavailable.
        }
    }, []);

    const clearLogs = useCallback(() => { setLogs([]); }, []);

    return {
        isLoaded,
        isExecuting,
        progress,
        progressMessage,
        logs,
        load,
        exec,
        cleanup,
        clearLogs,
    };
}

// ── 辅助函数 ────────────────────────────────────────────

function modifyCommand(command: string, inputName: string, outputName: string): string[] {
    const args = splitArgs(command);
    const filtered: string[] = [];
    let skipNext = false;
    for (const arg of args) {
        if (skipNext) { skipNext = false; continue; }
        if (arg === '-i') { skipNext = true; continue; }
        filtered.push(arg);
    }
    const outputIdx = filtered.findLastIndex((a) => !a.startsWith('-'));
    if (outputIdx >= 0) filtered.splice(outputIdx, 1);
    return ['-y', '-nostdin', '-i', inputName, ...filtered, outputName];
}

function splitArgs(command: string): string[] {
    const args: string[] = [];
    let current = '';
    let inSingle = false;
    let inDouble = false;
    for (const ch of command) {
        if (ch === "'" && !inDouble) { inSingle = !inSingle; }
        else if (ch === '"' && !inSingle) { inDouble = !inDouble; }
        else if (ch === ' ' && !inSingle && !inDouble) {
            if (current) { args.push(current); current = ''; }
        } else { current += ch; }
    }
    if (current) args.push(current);
    return args;
}
