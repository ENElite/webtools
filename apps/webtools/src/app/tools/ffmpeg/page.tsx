'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@heroui/react';
import { ToolLayout } from '@/components/ToolLayout';
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
    const [isDragActive, setIsDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showHelp, setShowHelp] = useState(false);

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

    // 拖拽处理
    const onDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragActive(true);
    }, []);
    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragActive(false);
    }, []);
    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
    }, []);
    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragActive(false);
        if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
    }, [handleFile]);

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
                    <div className='bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700 flex items-center gap-2'>
                        <span className='animate-spin'>⏳</span>
                        <span>
                            {ffmpeg.progressMessage || '正在加载 FFmpeg WASM（约 25MB）...'}
                            {ffmpeg.progress > 0 && ffmpeg.progress < 1 && (
                                <span className='ml-2'>({Math.round(ffmpeg.progress * 100)}%)</span>
                            )}
                        </span>
                    </div>
                )}

                {/* 错误提示 */}
                {error && (
                    <div className='bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center justify-between'>
                        <span>❌ {error}</span>
                        <button
                            className='text-red-500 hover:text-red-700 ml-2 text-lg'
                            onClick={() => setError(null)}
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* 视频预览区 */}
                {!hasFile ? (
                    <div
                        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                            isDragActive
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-300 hover:border-blue-500'
                        }`}
                        onDragEnter={onDragEnter}
                        onDragLeave={onDragLeave}
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type='file'
                            accept='video/*,audio/*'
                            className='hidden'
                            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                        />
                        <div className='text-5xl mb-3'>🎬</div>
                        <h3 className='text-lg font-bold mb-1'>
                            {isDragActive ? '释放鼠标上传文件' : '点击或拖拽视频/音频文件到此处'}
                        </h3>
                        <p className='text-gray-500 text-sm'>
                            支持 MP4, WebM, MKV, AVI, MOV, GIF, MP3, WAV 等格式
                        </p>
                    </div>
                ) : (
                    <>
                        {/* 视频播放器 */}
                        <div
                            className='relative rounded-lg overflow-hidden border border-gray-200 bg-black'
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
                                <div className='absolute inset-0 bg-black/40 flex items-center justify-center'>
                                    <div className='text-center text-white'>
                                        <div className='text-4xl mb-2 animate-spin'>⏳</div>
                                        <p>处理中...</p>
                                        {ffmpeg.progress > 0 && (
                                            <div className='mt-3 w-48 mx-auto'>
                                                <div className='bg-white/20 rounded-full h-2 overflow-hidden'>
                                                    <div
                                                        className='bg-blue-400 h-full rounded-full transition-all duration-300'
                                                        style={{ width: `${Math.round(ffmpeg.progress * 100)}%` }}
                                                    />
                                                </div>
                                                <p className='text-xs mt-1 opacity-80'>
                                                    {Math.round(ffmpeg.progress * 100)}%
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 命令行输入 */}
                        <div className='bg-gray-900 rounded-lg overflow-hidden'>
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
                                <input
                                    ref={commandInputRef}
                                    type='text'
                                    value={command}
                                    onChange={(e) => { setCommand(e.target.value); setCommandHistoryIndex(-1); }}
                                    onKeyDown={handleCommandKeyDown}
                                    placeholder='-i input.mp4 -vf scale=640:480 output.mp4'
                                    className='flex-1 bg-transparent text-white font-mono text-sm outline-none placeholder:text-gray-600'
                                    disabled={isBusy || !ffmpeg.isLoaded}
                                />
                            </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className='flex items-center justify-center gap-2 flex-wrap'>
                            <Button
                                onPress={handleExecute}
                                isDisabled={isBusy || !command.trim() || !ffmpeg.isLoaded}
                            >
                                ▶ 执行
                            </Button>
                            <Button
                                variant='ghost'
                                onPress={handleUndo}
                                isDisabled={isBusy || !canUndo}
                            >
                                ↩ 撤销
                            </Button>
                            <Button
                                variant='ghost'
                                onPress={handleRedo}
                                isDisabled={isBusy || !canRedo}
                            >
                                ↪ 重做
                            </Button>
                            <Button
                                variant='ghost'
                                onPress={handleReset}
                                isDisabled={isBusy || !originalFile}
                            >
                                🔄 重置
                            </Button>
                            <Button
                                variant='ghost'
                                onPress={handleSave}
                                isDisabled={isBusy || !hasFile}
                            >
                                💾 保存
                            </Button>
                            <Button
                                variant='ghost'
                                onPress={() => fileInputRef.current?.click()}
                                isDisabled={isBusy}
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
                        </div>

                        {/* 进度条（非遮罩模式下的独立显示） */}
                        {isBusy && ffmpeg.progress > 0 && (
                            <div className='space-y-1'>
                                <div className='bg-gray-200 rounded-full h-2 overflow-hidden'>
                                    <div
                                        className='bg-blue-500 h-full rounded-full transition-all duration-300'
                                        style={{ width: `${Math.round(ffmpeg.progress * 100)}%` }}
                                    />
                                </div>
                                <p className='text-xs text-gray-400 text-center'>
                                    {ffmpeg.progressMessage} {Math.round(ffmpeg.progress * 100)}%
                                </p>
                            </div>
                        )}

                        {/* 历史状态指示 */}
                        <div className='flex items-center justify-center gap-1'>
                            {history.map((entry, i) => (
                                <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full transition-colors ${
                                        i === historyIndex
                                            ? 'bg-blue-500'
                                            : i < historyIndex
                                                ? 'bg-blue-300'
                                                : 'bg-gray-300'
                                    }`}
                                    title={entry.command}
                                />
                            ))}
                        </div>
                        <p className='text-xs text-gray-400 text-center'>
                            状态 {historyIndex + 1}/{history.length}
                            {historyIndex > 0 && ` · ${history[historyIndex].command}`}
                        </p>

                        {/* 命令历史 */}
                        {commandHistory.length > 0 && (
                            <div className='bg-gray-50 rounded-lg border border-gray-200 overflow-hidden'>
                                <button
                                    className='w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-100 transition-colors'
                                    onClick={() => {
                                        const el = document.getElementById('cmd-history');
                                        if (el) el.hidden = !el.hidden;
                                    }}
                                >
                                    <span className='font-medium text-sm text-gray-700'>
                                        📋 命令历史 ({commandHistory.length})
                                    </span>
                                    <span className='text-gray-400 text-xs'>▼</span>
                                </button>
                                <div id='cmd-history' className='hidden px-4 pb-3 space-y-1'>
                                    {commandHistory.map((cmd, i) => (
                                        <div
                                            key={i}
                                            className='flex items-center gap-2 text-xs font-mono text-gray-600 hover:text-gray-900 cursor-pointer'
                                            onClick={() => setCommand(cmd)}
                                        >
                                            <span className='text-gray-400 w-5 text-right shrink-0'>{i + 1}.</span>
                                            <span className='truncate'>ffmpeg {cmd}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* 使用帮助 */}
                <div className='bg-gray-50 rounded-lg border border-gray-200 overflow-hidden'>
                    <button
                        className='w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-100 transition-colors'
                        onClick={() => setShowHelp(!showHelp)}
                    >
                        <span className='font-medium text-sm text-gray-700'>
                            💡 使用帮助
                        </span>
                        <span className='text-gray-400 text-xs'>{showHelp ? '▲ 收起' : '▼ 展开'}</span>
                    </button>
                    {showHelp && (
                        <div className='px-4 pb-4 text-sm text-gray-600 leading-relaxed space-y-3 border-t border-gray-200'>
                            <div>
                                <h4 className='font-semibold text-gray-800 mb-1'>基本用法</h4>
                                <p>上传视频后，在命令行中输入 FFmpeg 命令参数（无需输入 &quot;ffmpeg&quot; 前缀）。</p>
                                <p className='text-gray-400 text-xs mt-1'>
                                    系统会自动添加 -i 参数指向当前文件，并将输出保存为新状态。
                                </p>
                            </div>
                            <div>
                                <h4 className='font-semibold text-gray-800 mb-1'>常用命令示例</h4>
                                <div className='bg-white rounded p-3 font-mono text-xs space-y-1 border border-gray-200'>
                                    <div><span className='text-gray-400'># 缩放视频</span></div>
                                    <div>-i input.mp4 -vf scale=640:480 output.mp4</div>
                                    <div className='pt-1'><span className='text-gray-400'># 提取音频</span></div>
                                    <div>-i input.mp4 -vn -acodec copy output.aac</div>
                                    <div className='pt-1'><span className='text-gray-400'># 裁剪视频（从 10 秒开始，持续 5 秒）</span></div>
                                    <div>-i input.mp4 -ss 10 -t 5 -c copy output.mp4</div>
                                    <div className='pt-1'><span className='text-gray-400'># 转换格式</span></div>
                                    <div>-i input.mp4 output.webm</div>
                                    <div className='pt-1'><span className='text-gray-400'># 调整亮度</span></div>
                                    <div>-i input.mp4 -vf brightness=0.1 output.mp4</div>
                                    <div className='pt-1'><span className='text-gray-400'># 旋转视频</span></div>
                                    <div>-i input.mp4 -vf transpose=1 output.mp4</div>
                                    <div className='pt-1'><span className='text-gray-400'># 提取帧为图片</span></div>
                                    <div>-i input.mp4 -vf fps=1 output_%03d.png</div>
                                </div>
                            </div>
                            <div>
                                <h4 className='font-semibold text-gray-800 mb-1'>快捷键</h4>
                                <ul className='list-disc list-inside space-y-0.5 text-xs'>
                                    <li><kbd className='bg-gray-200 px-1 rounded'>Enter</kbd> — 执行命令</li>
                                    <li><kbd className='bg-gray-200 px-1 rounded'>↑</kbd> / <kbd className='bg-gray-200 px-1 rounded'>↓</kbd> — 浏览命令历史</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className='font-semibold text-gray-800 mb-1'>撤销 / 重做</h4>
                                <p>每次执行命令后，处理结果会保存到历史记录中。使用“撤销”回到上一步，“重做”前进到下一步，“重置”回到原始文件。</p>
                            </div>
                            <div>
                                <h4 className='font-semibold text-gray-800 mb-1'>注意事项</h4>
                                <ul className='list-disc list-inside space-y-0.5 text-xs text-gray-500'>
                                    <li>FFmpeg WASM 首次加载约需几秒（下载 ~25MB）</li>
                                    <li>处理大文件可能较慢，因为 WASM 性能低于原生 FFmpeg</li>
                                    <li>部分编解码器可能不被 WASM 版本支持</li>
                                    <li>所有处理在浏览器本地完成，文件不会上传到服务器</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ToolLayout>
    );
}
