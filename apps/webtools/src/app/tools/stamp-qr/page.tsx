'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert, Button } from '@webtools/ui';
import { StampColorSlider } from '@/components/StampColorSlider';
import { ToolLayout } from '@/components/ToolLayout';
import { CollapsibleSection, ResultPlaceholder } from '@/components/ToolPatterns';
import { DEFAULT_STAMP_OPTIONS, KINDS, KIND_LABELS, type StampOptions, type StampResult } from '@/lib/stamp-qr';

const field = 'w-full rounded-[var(--wt-radius-md)] border border-[var(--wt-color-border)] bg-[var(--wt-color-surface)] px-3 py-2.5 text-sm focus:outline-2 focus:outline-[var(--wt-color-accent)]';
const panel = 'rounded-[var(--wt-radius-lg)] border border-[var(--wt-color-border)] bg-[var(--wt-color-surface)] p-5 sm:p-6';

export default function StampQrPage() {
    const [options, setOptions] = useState<StampOptions>({ ...DEFAULT_STAMP_OPTIONS });
    const [result, setResult] = useState<(StampResult & { url: string }) | null>(null);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);
    const url = useRef<string | null>(null);
    useEffect(() => () => { if (url.current) URL.revokeObjectURL(url.current); }, []);
    useEffect(() => {
        let disposed = false;
        let worker: Worker | null = null;
        let timeout: ReturnType<typeof setTimeout> | undefined;
        setError('');
        if (!options.text.length) {
            setBusy(false); setResult(null); setStatus('请输入文字或链接');
            return;
        }
        setBusy(true); setStatus('等待输入结束…');
        function finish(message?: string) {
            worker?.terminate();
            clearTimeout(timeout);
            if (disposed) return;
            setBusy(false);
            if (message) setError(message);
        }
        const debounce = setTimeout(() => {
            setStatus('正在生成二维码…');
            try {
                worker = new Worker(new URL('@/workers/stamp-qr.worker.ts', import.meta.url));
                timeout = setTimeout(() => finish('生成超时，请缩短内容或限制 X 尺寸后重试。'), 120000);
                worker.onmessage = (event: MessageEvent<{ type: string; message?: string; payload?: StampResult }>) => {
                    if (disposed) return;
                    const msg = event.data;
                    if (msg.type === 'progress') setStatus(msg.message ?? '正在处理…');
                    if (msg.type === 'error') finish(msg.message ?? '生成失败。');
                    if (msg.type === 'done' && msg.payload) {
                        if (url.current) URL.revokeObjectURL(url.current);
                        url.current = URL.createObjectURL(msg.payload.blob);
                        setResult({ ...msg.payload, url: url.current }); finish();
                    }
                };
                worker.onerror = () => finish('浏览器引擎加载或执行失败，请重试。');
                worker.postMessage({ payload: options });
            } catch { finish('当前浏览器无法启动图像处理，请使用新版 Chrome、Edge 或 Firefox。'); }
        }, 150);
        return () => { disposed = true; clearTimeout(debounce); clearTimeout(timeout); worker?.terminate(); };
    }, [options, revision]);
    function change<K extends keyof StampOptions>(key: K, value: StampOptions[K]) {
        setOptions(prev => ({ ...prev, [key]: value }));
    }
    const changed = result && JSON.stringify(result.options) !== JSON.stringify(options);

    return (
        <ToolLayout title='印花集二维码' description='用 X、长条与方点重新组织二维码。在浏览器中完成精确排版与 PNG 导出，修改参数后自动更新。'>
            <div className='grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]'>
                <section className={panel} aria-label='二维码配置'>
                    <h2 className='mb-5 text-lg font-bold'>内容与样式</h2>
                    <fieldset className='space-y-5'>
                        <label className='block space-y-2 text-sm font-medium'>
                            <span>文字或链接</span>
                            <textarea className={`${field} min-h-28 resize-y`} value={options.text} onChange={e => change('text', e.target.value)} placeholder='输入文字或 https://…' />
                            <span className='block text-xs font-normal text-[var(--wt-color-text-muted)]'>UTF-8 编码 · {new TextEncoder().encode(options.text).length} / 1273 字节 · 尺寸随内容自动增长</span>
                        </label>
                        <div className='grid gap-4 sm:grid-cols-2'>
                            <label className='space-y-2 text-sm font-medium'><span className='block'>定位符方案</span>
                                <select className={field} value={options.finder} onChange={e => change('finder', e.target.value as StampOptions['finder'])}>
                                    <option value='standard'>完整外圈</option><option value='four_sides'>四边短线</option>
                                </select>
                            </label>
                            <label className='space-y-2 text-sm font-medium'><span className='block'>定位符宽度</span>
                                <select className={field} value={options.finderWidth} onChange={e => change('finderWidth', e.target.value as StampOptions['finderWidth'])}>
                                    <option value='standard'>标准宽度</option><option value='dot'>当前孤立点的宽度</option>
                                </select>
                            </label>
                        </div>
                        <label className='block space-y-2 text-sm font-medium'><span>五种结构方案</span>
                            <select className={field} value={options.xMode} onChange={e => change('xMode', e.target.value as StampOptions['xMode'])}>
                                <option value='all'>允许全部五种结构（X 尺寸不限）</option>
                                <option value='small'>不允许 3×3 及以上 X（保留 2×2 小 x）</option>
                                <option value='only3'>X 仅允许 3×3（不包含 2×2 小 x）</option>
                            </select>
                        </label>
                        <StampColorSlider value={options.colors} onChange={colors => change('colors', colors)} />
                        <label className='flex items-center justify-between gap-4 text-sm font-medium'><span>每格像素</span>
                            <select className={`${field} max-w-36`} value={options.moduleSize} onChange={e => change('moduleSize', Number(e.target.value))}>
                                {[12, 16, 24, 32, 48].map(n => <option key={n} value={n}>{n} px</option>)}
                            </select>
                        </label>
                    </fieldset>
                    <div className='mt-6 flex flex-wrap items-center gap-3'>
                        <Button variant='secondary' onClick={() => setOptions({ ...DEFAULT_STAMP_OPTIONS })}>恢复默认</Button>
                        {error && <Button onClick={() => setRevision(n => n + 1)}>重新生成</Button>}
                        <span className='text-xs text-[var(--wt-color-text-muted)]'>停止修改 150 毫秒后自动生成</span>
                    </div>
                    {busy && <p role='status' className='mt-4 text-sm text-[var(--wt-color-text-muted)]'>{status} 内容较长时，精确优化可能需要更久。</p>}
                    {error && <div className='mt-4' role='alert'><Alert tone='danger'>{error}</Alert></div>}
                </section>
                <section className={`${panel} space-y-5`} aria-label='生成结果' aria-busy={busy}>
                    <div className='flex items-center justify-between'><h2 className='text-lg font-bold'>二维码预览</h2><span className='text-xs text-[var(--wt-color-text-muted)]'>纯黑背景 · PNG</span></div>
                    {result ? <>
                        <div className='flex justify-center overflow-hidden bg-black p-2'><img src={result.url} alt='已生成的印花集二维码' width={result.pixels} height={result.pixels} className='h-auto w-full max-w-[480px]' /></div>
                        <p className='text-sm text-[var(--wt-color-text-muted)]'>版本 {result.version} · {result.modules}×{result.modules} 格 · {result.pixels}×{result.pixels} px · H 级纠错</p>
                        <div className='grid grid-cols-5 gap-2 text-center'>{KINDS.map(k => <div key={k} className='rounded-[var(--wt-radius-md)] bg-[var(--wt-color-surface-tinted)] py-3'><div className='text-lg font-bold'>{result.counts[k]}</div><div className='text-xs text-[var(--wt-color-text-muted)]'>{KIND_LABELS[k]}</div></div>)}</div>
                        <p className='text-xs text-[var(--wt-color-text-muted)]'>共 {Object.values(result.counts).reduce((a, b) => a + b, 0)} 个结构，已证明当前掩码 {result.mask} 下的字典序最优。</p>
                        {(changed || busy) && <p className='text-sm text-[var(--wt-color-text-muted)]'>正在更新，当前预览为上次生成的图片。</p>}
                        {!changed && !busy && !error && <a className='inline-flex items-center justify-center rounded-[var(--wt-radius-md)] bg-[var(--wt-color-accent)] px-5 py-3 text-sm font-bold text-white' href={result.url} download={`stamp-qr-v${result.version}-${result.options.finder}-${result.options.colors.join('-')}.png`}>下载 PNG</a>}
                    </> : <ResultPlaceholder icon={<span className='text-5xl'>❖</span>} title={busy ? '正在排列每一个结构' : '让文字成为一张印花'} description='输入内容或修改样式，二维码将自动生成，完成后即可下载。' />}
                </section>
            </div>
            <div className='mt-6 space-y-4'>
                <CollapsibleSection title='算法与原理' defaultOpen>
                    <p><strong>1. 编码矩阵。</strong>将原文按 UTF-8 字节编码，使用 H 级 Reed–Solomon 纠错，自动选择能够容纳内容的二维码版本。外围保留 4 格纯黑静区。仅三个角的 7×7 定位符单独处理，其他有效格子都参与结构排版。</p>
                    <p><strong>2. 枚举五种结构。</strong>完整双对角线形成 X：2×2 为小 x，3×3 及以上为大 X；竖线至少 3 格、横线至少 2 格，其余可以为孤立点。尺寸选项只限制 X，线和点始终可用。“仅 3×3”同时排除小 x 与更大的 X。</p>
                    <p><strong>3. 求最少结构。</strong>沿用 Python 的整数规划：每个有效格子恰好归属一个结构，X 包围盒彼此不重叠，也不能与竖线相交；横线可经过 X 包围盒内未归属 X 的格子。先最小化总结构数，再依次最大化大 X、竖线、横线、小 x 的覆盖格数。每一步锁定最优值后再进入下一步，独立连通分量分别求解。</p>
                    <p><strong>4. 绘制形状。</strong>孤立点边长为（每格像素 − 1）/√2，与 X 端部旋转 45° 正方形的边长相同；X 格子不绘制底层方点。竖线末格分离为同色方点，统计仍归属原竖线。定位符和 X 使用更亮色，竖线使用亮色，横线使用暗色，点使用更暗色。X 最后绘制，始终位于最上层，形状均无圆角。</p>
                    <p><strong>5. 定位符。</strong>完整外圈方案保留外圈和中心方块；四边短线方案保留中心 3×3 方块和四条 3×1 短边。标准宽度保留中央扫描线 1:1:3:1:1 的比例；孤立点宽度会收细轮廓与中心方块，可能降低识别率。</p>
                    <p><strong>6. 自动生成与导出。</strong>参数停止变化 150 毫秒后开始生成，继续修改会终止上一项任务，仅展示最新结果。使用编码器选择的掩码完成排版后直接导出 PNG，不进行解码校验或轮换掩码。优化超时会明确报错，不把近似解标为最优。</p>
                </CollapsibleSection>
                <CollapsibleSection title='使用说明与识别兼容性'>
                    <p>默认使用四边短线定位符、全部五种结构及标准宽度。四种亮度从暗到亮为 64、112、238、255，通过同一条滑轨调整，滑块不可交叉。所有计算均在浏览器中完成，文字和图片不会上传。首次使用需要加载本站的 WebAssembly 引擎。</p>
                    <p>这里的“最优”针对当前编码矩阵与所选结构规则，不代表跨所有二维码掩码的全局最优。内容越长，候选结构越多，建议优先使用短链接。</p>
                    <p>生成过程不进行扫码验证。短线定位符及较暗颜色的兼容性较低；若目标设备无法识别，请提高暗色值、选择完整外圈定位符及标准宽度，再用目标设备验证。下载原始 PNG，避免截图、裁掉静区或有损压缩。</p>
                </CollapsibleSection>
            </div>
        </ToolLayout>
    );
}
