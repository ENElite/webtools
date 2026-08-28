import { NextResponse } from 'next/server';

type ChatMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

type ChatRequest = {
    model?: string;
    messages?: ChatMessage[];
    temperature?: number;
    apiKey?: string;
    stream?: boolean;
};

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as ChatRequest;

        // Use request body apiKey if provided, otherwise fall back to server env
        const apiKey = body.apiKey || process.env['DEEPSEEK_API_KEY'];
        if (!apiKey) {
            return NextResponse.json({ ok: false, error: 'Missing DEEPSEEK_API_KEY' }, { status: 500 });
        }

        const payload: ChatRequest = {
            model: body.model || 'deepseek-chat',
            temperature: typeof body.temperature === 'number' ? body.temperature : 0.3,
            messages: Array.isArray(body.messages) ? body.messages : [],
            stream: body.stream ?? false,
        };

        const response = await fetch(DEEPSEEK_ENDPOINT, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json({ ok: false, error: errorData }, { status: response.status });
        }

        // Handle streaming response
        if (payload.stream && response.body) {
            return new Response(response.body, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });
        }

        // Handle non-streaming response
        const data = await response.json();
        return NextResponse.json({ ok: true, data });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'DeepSeek proxy failed';
        return NextResponse.json({ ok: false, error: message }, { status: 502 });
    }
}
