import { NextResponse } from 'next/server';

const KONACHAN_ENDPOINT = 'https://konachan.net/post.json';

export async function GET(request: Request) {
    try {
        const sourceUrl = new URL(request.url);
        const targetUrl = new URL(KONACHAN_ENDPOINT);
        targetUrl.search = sourceUrl.search;

        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
        });
        const data = await response.json();
        if (!response.ok) {
            return NextResponse.json(data);
        }

        return NextResponse.json(data);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Konachan proxy failed';
        return NextResponse.json(message, { status: 502 });
    }
}
