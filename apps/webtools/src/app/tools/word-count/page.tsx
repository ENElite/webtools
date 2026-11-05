'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { Button, Card, CardContent, Field, Textarea } from '@webtools/ui';
import { ToolLayout } from '@/components/ToolLayout';
import { countText } from '@/lib/word-count';

export default function WordCountPage() {
    const [text, setText] = useState('');
    const deferredText = useDeferredValue(text);
    const statistics = useMemo(() => countText(deferredText), [deferredText]);
    const metrics = [
        ['字数（不含空白）', statistics.charactersWithoutWhitespace],
        ['字符数（含空白）', statistics.characters],
        ['汉字', statistics.hanCharacters],
        ['英文单词', statistics.englishWords],
        ['数字字符', statistics.digits],
        ['行数', statistics.lines],
        ['段落数', statistics.paragraphs],
    ] as const;

    return (
        <ToolLayout title='字数统计器' description='粘贴或输入文本，即时查看字数与文本结构。所有统计均在浏览器本地完成。'>
            <div className='mx-auto w-full max-w-5xl space-y-6'>
                <Card>
                    <CardContent className='space-y-4'>
                        <div className='flex items-center justify-between gap-4'>
                            <label htmlFor='word-count-text' className='font-bold text-[var(--wt-color-text)]'>待统计文本</label>
                            <Button variant='secondary' disabled={!text} onClick={() => setText('')}>清空文本</Button>
                        </div>
                        <Field>
                            <Textarea
                                id='word-count-text'
                                value={text}
                                onChange={(event) => setText(event.target.value)}
                                placeholder='在这里输入或粘贴中文、英文或混合文本…'
                                rows={12}
                                className='min-h-72 resize-y leading-7'
                                aria-describedby='word-count-rules'
                                spellCheck={false}
                            />
                        </Field>
                        <p className='text-sm text-[var(--wt-color-text-muted)]'>文本不会上传到服务器，也不会自动保存。</p>
                    </CardContent>
                </Card>

                <dl className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4' aria-label='文本统计结果' aria-busy={text !== deferredText}>
                    {metrics.map(([label, value]) => (
                        <div key={label} className='rounded-[var(--wt-radius-lg)] border border-[var(--wt-color-border)] bg-[var(--wt-color-surface)] p-5 shadow-[var(--wt-shadow-sm)]'>
                            <dt className='text-sm text-[var(--wt-color-text-muted)]'>{label}</dt>
                            <dd className='mt-2 text-3xl font-bold tabular-nums text-[var(--wt-color-text)]'>{value.toLocaleString('zh-CN')}</dd>
                        </div>
                    ))}
                </dl>

                <Card>
                    <CardContent className='space-y-2 text-sm leading-7 text-[var(--wt-color-text-muted)]'>
                        <h2 id='word-count-rules' className='font-bold text-[var(--wt-color-text)]'>统计口径</h2>
                        <p>字数包含标点与 Emoji，不含空格、制表符、换行等空白字符。组合 Emoji 和带组合音标的字母各计为一个字符；不同系统的换行统一计为一个字符。</p>
                        <p>汉字单独计数；英文单词按连续英文字母统计，词内的撇号和连字符不拆词；数字按数字字符逐个计数（例如 123 计为 3）。</p>
                        <p>行数包含空行与末尾换行产生的空行；段落以空行分隔，连续的非空行属于同一段，纯空白段落不计。空文本的所有统计值均为 0。</p>
                    </CardContent>
                </Card>
            </div>
        </ToolLayout>
    );
}
