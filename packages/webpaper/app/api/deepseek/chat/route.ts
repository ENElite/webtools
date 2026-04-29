import { NextResponse } from 'next/server';

type ChatMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

type ChatRequest = {
    model?: string;
    messages?: ChatMessage[];
    temperature?: number;
};

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';

export async function POST(request: Request) {
    try {
        const apiKey = process.env['DEEPSEEK_API_KEY'];
        if (!apiKey) {
            return NextResponse.json({ ok: false, error: 'Missing DEEPSEEK_API_KEY' }, { status: 500 });
        }

        const body = (await request.json()) as ChatRequest;
        const payload: ChatRequest = {
            model: body.model || 'deepseek-chat',
            temperature: typeof body.temperature === 'number' ? body.temperature : 0.3,
            messages: Array.isArray(body.messages) ? body.messages : [],
        };

        const response = await fetch(DEEPSEEK_ENDPOINT, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) {
            return NextResponse.json({ ok: false, error: data }, { status: response.status });
        }

        return NextResponse.json({ ok: true, data });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'DeepSeek proxy failed';
        return NextResponse.json({ ok: false, error: message }, { status: 502 });
    }
}
