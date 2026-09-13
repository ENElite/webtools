import { NextResponse } from 'next/server';
import { z } from 'zod';

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';

const chatRequestSchema = z.object({
    model: z.string().trim().min(1).max(100).default('deepseek-chat'),
    messages: z.array(z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string().max(40_000),
    })).min(1).max(100),
    temperature: z.number().min(0).max(2).default(0.3),
    apiKey: z.string().trim().max(256).optional(),
    stream: z.boolean().default(false),
}).strict();

export async function POST(request: Request): Promise<Response> {
    let input: unknown;
    try {
        input = await request.json();
    } catch {
        return NextResponse.json({ error: '请求体必须是 JSON。' }, { status: 400 });
    }

    const parsed = chatRequestSchema.safeParse(input);
    if (!parsed.success) {
        return NextResponse.json({ error: '请求参数无效。', issues: parsed.error.issues }, { status: 400 });
    }

    const apiKey = parsed.data.apiKey || process.env['DEEPSEEK_API_KEY'];
    if (!apiKey) {
        return NextResponse.json({ error: '未配置 DeepSeek API Key。' }, { status: 503 });
    }

    try {
        const response = await fetch(DEEPSEEK_ENDPOINT, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: parsed.data.model,
                messages: parsed.data.messages,
                temperature: parsed.data.temperature,
                stream: parsed.data.stream,
            }),
            signal: AbortSignal.timeout(60_000),
        });

        if (parsed.data.stream && response.body) {
            return new Response(response.body, {
                status: response.status,
                headers: {
                    'Content-Type': 'text/event-stream; charset=utf-8',
                    'Cache-Control': 'no-store',
                },
            });
        }

        const data: unknown = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'DeepSeek 请求失败。';
        return NextResponse.json({ error: message }, { status: 502 });
    }
}
