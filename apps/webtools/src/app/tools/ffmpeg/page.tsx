'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Alert, Button, FileUpload, Progress, Spinner, TextInput, Toolbar } from '@webtools/ui';
import { ToolLayout } from '@/components/ToolLayout';
import { CollapsibleSection, ProcessProgress } from '@/components/ToolPatterns';
import { useFFmpeg } from '@/lib/useFFmpeg';

// ── 类型 ────────────────────────────────────────────────

interface HistoryEntry {
    data: Uint8Array;
    command: string;
    fileName: string;
}

// ── 工具函数 ────────────────────────────────────────────

/** 根据文件扩展名获取 MIME 类型 */
function getVideoMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    const map: Record<string, string> = {
        mp4: 'video/mp4',
        webm: 'video/webm',
        mkv: 'video/x-matroska',
        avi: 'video/x-msvideo',
        mov: 'video/quicktime',
        gif: 'image/gif',
        wav: 'audio/wav',
        mp3: 'audio/mpeg',
        aac: 'audio/aac',
        flac: 'audio/flac',
        ogg: 'audio/ogg',
    };
    return map[ext] ?? 'video/mp4';
}

/** 从文件名获取扩展名 */
function getExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop()! : 'mp4';
}

/** 格式化文件大小 */
function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── 主页面 ──────────────────────────────────────────────

export default function FFmpegPage() {
    // FFmpeg Worker
    const ffmpeg = useFFmpeg();

    // 文件状态
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [currentState, setCurrentState] = useState<Uint8Array | null>(null);
    const [currentFileName, setCurrentFileName] = useState('');

    // 历史记录（undo/redo）
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // 命令输入
    const [command, setCommand] = useState('');
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [commandHistoryIndex, setCommandHistoryIndex] = useState(-1);

    // UI 状态
    const [error, setError] = useState<string | null>(null);

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const commandInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // ── 视频预览 URL ──────────────────────────────────

    const videoUrl = useMemo(() => {
        if (!currentState) return null;
        const blob = new Blob([currentState.buffer as ArrayBuffer], { type: getVideoMimeType(currentFileName) });
        return URL.createObjectURL(blob);
    }, [currentState, currentFileName]);

    // 清理 blob URL
    useEffect(() => {
        return () => {
            if (videoUrl) URL.revokeObjectURL(videoUrl);
        };
    }, [videoUrl]);

    // ── 初始化 FFmpeg ─────────────────────────────────

    useEffect(() => {
        if (!ffmpeg.isLoaded && !ffmpeg.isExecuting) {
            ffmpeg.load().catch((err) => {
                setError(`FFmpeg 加载失败: ${err instanceof Error ? err.message : String(err)}`);
            });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── 文件上传 ──────────────────────────────────────

    const handleFile = useCallback((file: File) => {
        setError(null);
        setOriginalFile(file);
        setCurrentFileName(file.name);

        const reader = new FileReader();
        reader.onload = () => {
            const data = new Uint8Array(reader.result as ArrayBuffer);
            setCurrentState(data);
            setHistory([{ data, command: '(原始文件)', fileName: file.name }]);
            setHistoryIndex(0);
            setCommand('');
        };
        reader.readAsArrayBuffer(file);
    }, []);

    // ── 执行命令 ──────────────────────────────────────

    const handleExecute = useCallback(async () => {
        if (!command.trim() || !currentState || !ffmpeg.isLoaded) return;

        setError(null);
        const ext = getExtension(currentFileName);
        const inputName = `input.${ext}`;
        const outputName = `output.${ext}`;

        try {
            const result = await ffmpeg.exec(
                command.trim(),
                currentState,
                inputName,
                outputName,
            );

            // 清理旧的后续历史
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push({
                data: result,
                command: command.trim(),
                fileName: currentFileName,
            });

            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
            setCurrentState(result);
            setCommandHistory((prev) => [...prev, command.trim()]);
            setCommandHistoryIndex(-1);
            setCommand('');
        } catch (err) {
            setError(err instanceof Error ? err.message : '处理失败');
        }
    }, [command, currentState, currentFileName, ffmpeg, history, historyIndex]);

    // ── Undo / Redo / Reset ───────────────────────────

    const handleUndo = useCallback(() => {
        if (historyIndex <= 0) return;
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentState(history[newIndex].data);
        setCurrentFileName(history[newIndex].fileName);
        setError(null);
    }, [history, historyIndex]);

    const handleRedo = useCallback(() => {
        if (historyIndex >= history.length - 1) return;
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentState(history[newIndex].data);
        setCurrentFileName(history[newIndex].fileName);
        setError(null);
    }, [history, historyIndex]);

    const handleReset = useCallback(() => {
        if (!originalFile) return;
        const reader = new FileReader();
        reader.onload = () => {
            const data = new Uint8Array(reader.result as ArrayBuffer);
            setCurrentState(data);
            setHistory([{ data, command: '(原始文件)', fileName: originalFile.name }]);
            setHistoryIndex(0);
            setCommand('');
            setError(null);
        };
        reader.readAsArrayBuffer(originalFile);
    }, [originalFile]);

    // ── 保存结果 ──────────────────────────────────────

    const handleSave = useCallback(() => {
        if (!currentState || !currentFileName) return;
        const blob = new Blob([currentState.buffer as ArrayBuffer], { type: getVideoMimeType(currentFileName) });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFileName;
        a.click();
        URL.revokeObjectURL(url);
    }, [currentState, currentFileName]);

    // ── 命令历史导航 ──────────────────────────────────

    const handleCommandKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleExecute();
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (commandHistory.length === 0) return;
            const newIndex = commandHistoryIndex < commandHistory.length - 1
                ? commandHistoryIndex + 1
                : commandHistoryIndex;
            setCommandHistoryIndex(newIndex);
            setCommand(commandHistory[commandHistory.length - 1 - newIndex] ?? '');
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (commandHistoryIndex <= 0) {
                setCommandHistoryIndex(-1);
                setCommand('');
                return;
            }
            const newIndex = commandHistoryIndex - 1;
            setCommandHistoryIndex(newIndex);
            setCommand(commandHistory[commandHistory.length - 1 - newIndex] ?? '');
        }
    }, [handleExecute, commandHistory, commandHistoryIndex]);

    // ── 计算派生状态 ──────────────────────────────────

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;
    const hasFile = currentState !== null;
    const isBusy = ffmpeg.isExecuting;

    // ── 渲染 ──────────────────────────────────────────

    return (
        <ToolLayout
            title='FFmpeg 在线工具'
            description='在浏览器中运行 FFmpeg 命令处理视频，支持撤销/重做'
        >
            <div className='max-w-4xl mx-auto space-y-4 w-full'>
                {/* FFmpeg 加载状态 */}
                {!ffmpeg.isLoaded && (
                    <Alert tone='info' title='正在准备本地处理引擎'>
                        <div className='flex items-center gap-3'>
                            <Spinner size='sm' />
                            <span>
                            {ffmpeg.progressMessage || '正在加载 FFmpeg WASM（约 25MB）...'}
                            </span>
                        </div>
                        {ffmpeg.progress > 0 && ffmpeg.progress < 1 && (
                            <Progress value={ffmpeg.progress * 100} showValue />
                        )}
                    </Alert>
                )}

                {/* 错误提示 */}
                {error && (
                    <Alert tone='danger' title='FFmpeg 处理失败'>
                        <div className='flex flex-wrap items-center justify-between gap-3'>
                            <span>{error}</span>
                            <Button size='sm' variant='ghost' onClick={() => setError(null)}>关闭</Button>
                        </div>
                    </Alert>
                )}

                {/* 视频预览区 */}
                {!hasFile ? (
                    <FileUpload
                        accept='video/*,audio/*'
                        maxFiles={1}
                        label='上传视频或音频'
                        description='支持 MP4、WebM、MKV、AVI、MOV、GIF、MP3 和 WAV 等格式'
                        onFilesChange={(files: File[]) => files[0] && handleFile(files[0])}
                    />
                ) : (
                    <>
                        {/* 视频播放器 */}
                        <div
                            className='relative overflow-hidden rounded-[var(--wt-radius-lg)] border border-[var(--wt-color-border)] bg-black'
                        >
                            <video
                                ref={videoRef}
                                src={videoUrl ?? undefined}
                                controls
                                className='w-full max-h-[40vh] object-contain'
                            />
                            <div className='absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded'>
                                {formatSize(currentState!.length)}
                            </div>
                            {/* 处理中遮罩 */}
                            {isBusy && (
                                <div className='absolute inset-0 grid place-items-center bg-black/35 p-4 backdrop-blur-[2px]'>
                                    <ProcessProgress progress={ffmpeg.progress} label='正在执行 FFmpeg 命令' />
                                </div>
                            )}
                        </div>

                        {/* 命令行输入 */}
                        <div className='overflow-hidden rounded-[var(--wt-radius-lg)] bg-gray-900 shadow-[var(--wt-shadow-md)]'>
                            <div className='flex items-center gap-2 px-3 py-2 bg-gray-800'>
                                <div className='flex gap-1.5'>
                                    <div className='w-3 h-3 rounded-full bg-red-500' />
                                    <div className='w-3 h-3 rounded-full bg-yellow-500' />
                                    <div className='w-3 h-3 rounded-full bg-green-500' />
                                </div>
                                <span className='text-gray-400 text-xs ml-2'>FFmpeg 终端</span>
                            </div>
                            <div className='flex items-center px-4 py-3'>
                                <span className='text-green-400 font-mono text-sm mr-2 select-none'>$</span>
                                <span className='text-gray-400 font-mono text-sm mr-2 select-none'>ffmpeg</span>
                                <TextInput
                                    ref={commandInputRef}
                                    type='text'
                                    value={command}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        setCommand(e.target.value);
                                        setCommandHistoryIndex(-1);
                                    }}
                                    onKeyDown={handleCommandKeyDown}
                                    placeholder='-i input.mp4 -vf scale=640:480 output.mp4'
                                    className='min-w-0 flex-1 border-0! bg-transparent! font-mono text-sm text-white shadow-none! outline-none placeholder:text-gray-600'
                                    disabled={isBusy || !ffmpeg.isLoaded}
                                />
                            </div>
                        </div>

                        {/* 操作按钮 */}
                        <Toolbar className='flex flex-wrap items-center justify-center gap-2'>
                            <Button
                                onClick={handleExecute}
                                disabled={isBusy || !command.trim() || !ffmpeg.isLoaded}
                                loading={isBusy}
                            >
                                ▶ 执行
                            </Button>
                            <Button
                                variant='ghost'
                                onClick={handleUndo}
                                disabled={isBusy || !canUndo}
                            >
                                ↩ 撤销
                            </Button>
                            <Button
                                variant='ghost'
                                onClick={handleRedo}
                                disabled={isBusy || !canRedo}
                            >
                                ↪ 重做
                            </Button>
                            <Button
                                variant='ghost'
                                onClick={handleReset}
                                disabled={isBusy || !originalFile}
                            >
                                🔄 重置
                            </Button>
                            <Button
                                variant='ghost'
                                onClick={handleSave}
                                disabled={isBusy || !hasFile}
                            >
                                💾 保存
                            </Button>
                            <Button
                                variant='ghost'
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isBusy}
                            >
                                📁 更换文件
                            </Button>
                            <input
                                ref={fileInputRef}
                                type='file'
                                accept='video/*,audio/*'
                                className='hidden'
                                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                            />
                        </Toolbar>

                        {/* 进度条（非遮罩模式下的独立显示） */}
                        {isBusy && ffmpeg.progress > 0 && (
                            <Progress value={ffmpeg.progress * 100} label={ffmpeg.progressMessage} showValue />
                        )}

                        {/* 历史状态指示 */}
                        <div className='flex items-center justify-center gap-1'>
                            {history.map((entry, i) => (
                                <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full transition-colors ${
                                        i === historyIndex
                                            ? 'bg-[var(--wt-color-accent)]'
                                            : i < historyIndex
                                                ? 'bg-[var(--wt-color-accent-soft)]'
                                                : 'bg-[var(--wt-color-border-strong)]'
                                    }`}
                                    title={entry.command}
                                />
                            ))}
                        </div>
                        <p className='text-center text-xs text-[var(--wt-color-text-muted)]'>
                            状态 {historyIndex + 1}/{history.length}
                            {historyIndex > 0 && ` · ${history[historyIndex].command}`}
                        </p>

                        {/* 命令历史 */}
                        {commandHistory.length > 0 && (
                            <CollapsibleSection title={`📋 命令历史 (${commandHistory.length})`}>
                                <div className='space-y-1'>
                                    {commandHistory.map((cmd, i) => (
                                        <button
                                            type='button'
                                            key={i}
                                            className='flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left font-mono text-xs transition hover:bg-[var(--wt-color-accent-soft)] hover:text-[var(--wt-color-text)]'
                                            onClick={() => setCommand(cmd)}
                                        >
                                            <span className='w-5 shrink-0 text-right text-[var(--wt-color-text-muted)]'>{i + 1}.</span>
                                            <span className='truncate'>ffmpeg {cmd}</span>
                                        </button>
                                    ))}
                                </div>
                            </CollapsibleSection>
                        )}
                    </>
                )}

                {/* 使用帮助 */}
                <CollapsibleSection title='💡 使用帮助'>
                            <div>
                                <h4 className='mb-1 font-semibold text-[var(--wt-color-text)]'>基本用法</h4>
                                <p>上传视频后，在命令行中输入 FFmpeg 命令参数（无需输入 &quot;ffmpeg&quot; 前缀）。</p>
                                <p className='mt-1 text-xs text-[var(--wt-color-text-muted)]'>
                                    系统会自动添加 -i 参数指向当前文件，并将输出保存为新状态。
                                </p>
                            </div>
                            <div>
                                <h4 className='mb-1 font-semibold text-[var(--wt-color-text)]'>常用命令示例</h4>
                                <div className='space-y-1 rounded-[var(--wt-radius-md)] border border-[var(--wt-color-border)] bg-[var(--wt-color-surface-tinted)] p-3 font-mono text-xs'>
                                    <div><span className='text-[var(--wt-color-text-muted)]'># 缩放视频</span></div>
                                    <div>-i input.mp4 -vf scale=640:480 output.mp4</div>
                                    <div className='pt-1'><span className='text-[var(--wt-color-text-muted)]'># 提取音频</span></div>
                                    <div>-i input.mp4 -vn -acodec copy output.aac</div>
                                    <div className='pt-1'><span className='text-[var(--wt-color-text-muted)]'># 裁剪视频（从 10 秒开始，持续 5 秒）</span></div>
                                    <div>-i input.mp4 -ss 10 -t 5 -c copy output.mp4</div>
                                    <div className='pt-1'><span className='text-[var(--wt-color-text-muted)]'># 转换格式</span></div>
                                    <div>-i input.mp4 output.webm</div>
                                    <div className='pt-1'><span className='text-[var(--wt-color-text-muted)]'># 调整亮度</span></div>
                                    <div>-i input.mp4 -vf brightness=0.1 output.mp4</div>
                                    <div className='pt-1'><span className='text-[var(--wt-color-text-muted)]'># 旋转视频</span></div>
                                    <div>-i input.mp4 -vf transpose=1 output.mp4</div>
                                    <div className='pt-1'><span className='text-[var(--wt-color-text-muted)]'># 提取帧为图片</span></div>
                                    <div>-i input.mp4 -vf fps=1 output_%03d.png</div>
                                </div>
                            </div>
                            <div>
                                <h4 className='mb-1 font-semibold text-[var(--wt-color-text)]'>快捷键</h4>
                                <ul className='list-disc list-inside space-y-0.5 text-xs'>
                                    <li><kbd className='rounded-[var(--wt-radius-sm)] bg-[var(--wt-color-accent-soft)] px-1'>Enter</kbd> — 执行命令</li>
                                    <li><kbd className='rounded-[var(--wt-radius-sm)] bg-[var(--wt-color-accent-soft)] px-1'>↑</kbd> / <kbd className='rounded-[var(--wt-radius-sm)] bg-[var(--wt-color-accent-soft)] px-1'>↓</kbd> — 浏览命令历史</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className='mb-1 font-semibold text-[var(--wt-color-text)]'>撤销 / 重做</h4>
                                <p>每次执行命令后，处理结果会保存到历史记录中。使用“撤销”回到上一步，“重做”前进到下一步，“重置”回到原始文件。</p>
                            </div>
                            <div>
                                <h4 className='mb-1 font-semibold text-[var(--wt-color-text)]'>注意事项</h4>
                                <ul className='list-inside list-disc space-y-0.5 text-xs text-[var(--wt-color-text-muted)]'>
                                    <li>FFmpeg WASM 首次加载约需几秒（下载 ~25MB）</li>
                                    <li>处理大文件可能较慢，因为 WASM 性能低于原生 FFmpeg</li>
                                    <li>部分编解码器可能不被 WASM 版本支持</li>
                                    <li>所有处理在浏览器本地完成，文件不会上传到服务器</li>
                                </ul>
                            </div>
                </CollapsibleSection>
            </div>
        </ToolLayout>
    );
}
