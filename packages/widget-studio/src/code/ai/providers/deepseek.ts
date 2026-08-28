import type { AIProvider, AIProviderSendParams, AIProviderChunk } from '../types';

export type DeepSeekProviderConfig = {
    /** Base URL of the DeepSeek API proxy (default: '/api/deepseek/chat') */
    baseUrl?: string;
    /** API key for authentication (optional when using server-side proxy) */
    apiKey?: string;
    /** Model name (default: 'deepseek-chat') */
    model?: string;
};

const DEFAULT_BASE_URL = '/api/deepseek/chat';
const DEFAULT_MODEL = 'deepseek-chat';

function buildSystemPrompt(mode: AIProviderSendParams['mode']): string {
    const searchMarker = '<'.repeat(7);
    const separatorMarker = '='.repeat(7);
    const replaceMarker = '>'.repeat(7);
    const base = `You are an AI code editor assistant. You help users write and modify code.

IMPORTANT RULES:
1. When modifying existing code, use edit blocks to show changes
2. When creating NEW code or when the document is EMPTY, output the complete code in a code block
3. Always wrap your code in proper markdown code blocks with language tags

Edit block format (for modifying existing code):
\`\`\`edit
${searchMarker} SEARCH
(original code to find - must match exactly)
${separatorMarker}
(new code to replace with)
${replaceMarker} REPLACE
\`\`\`

Code block format (for new code or complete rewrites):
\`\`\`html
<!DOCTYPE html>
<html>
...your code here...
</html>
\`\`\`

You can include multiple edit blocks. Always explain what you changed.
Be concise and make minimal, targeted changes.`;

    switch (mode) {
        case 'ask':
            return `You are a helpful AI assistant. Answer questions about code clearly and concisely.
Do NOT suggest code edits unless explicitly asked. Focus on explaining concepts, debugging, and answering questions.`;
        case 'agent':
            return base;
        case 'plan':
            return `You are a code planning assistant. Analyze the user's request and provide a clear plan.
Do NOT write code edits. Instead, outline the steps needed and explain your reasoning.
Format your response as a structured plan with numbered steps.`;
        case 'auto':
            return base + `\n\nIMPORTANT: When making edits, always output complete, production-ready code.
The edits will be auto-accepted without user review.`;
        default:
            return base;
    }
}

function buildUserMessage(params: AIProviderSendParams): string {
    let msg = params.content;

    if (params.selection) {
        msg = `Selected code (L${params.selection.startLine}-${params.selection.endLine}):\n\`\`\`\n${params.selection.text}\n\`\`\`\n\n${msg}`;
    }

    if (params.mode !== 'ask') {
        msg = `Current document:\n\`\`\`\n${params.documentContent}\n\`\`\`\n\n${msg}`;
    }

    return msg;
}

function parseEditBlocks(text: string): Array<{ oldText: string; newText: string }> {
    const edits: Array<{ oldText: string; newText: string }> = [];
    // More flexible regex that handles optional trailing newlines and whitespace
    const regex = /<<<<<<<\s*SEARCH\s*\n([\s\S]*?)=======\s*\n([\s\S]*?)>>>>>>>?\s*(?:\n|$)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        const oldText = match[1];
        const newText = match[2];
        if (oldText === undefined || newText === undefined) continue;
        edits.push({
            oldText: oldText.trimEnd(),
            newText: newText.trimEnd(),
        });
    }

    return edits;
}

/**
 * Extract code blocks from AI response when no edit blocks are found.
 * This handles cases where the AI returns code blocks instead of edit blocks,
 * such as when creating new content.
 */
function extractCodeBlocks(text: string): Array<{ language: string; code: string }> {
    const blocks: Array<{ language: string; code: string }> = [];
    const regex = /```(\w*)\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        const language = match[1] || 'unknown';
        const code = match[2]?.trim() ?? '';
        if (code) {
            blocks.push({ language, code });
        }
    }

    return blocks;
}

function findEditRange(documentContent: string, oldText: string): { startLine: number; startColumn: number; endLine: number; endColumn: number } | null {
    // If document is empty, return null to trigger fallback handling
    if (!documentContent.trim()) {
        return null;
    }

    const lines = documentContent.split('\n');
    const searchLines = oldText.split('\n');

    // Skip empty search patterns
    if (searchLines.length === 0 || (searchLines.length === 1 && searchLines[0] === '')) {
        return null;
    }

    for (let i = 0; i <= lines.length - searchLines.length; i++) {
        let match = true;
        for (let j = 0; j < searchLines.length; j++) {
            if (lines[i + j] !== searchLines[j]) {
                match = false;
                break;
            }
        }
        if (match) {
            return {
                startLine: i + 1, // 1-based
                startColumn: 1,
                endLine: i + searchLines.length, // 1-based, inclusive
                endColumn: (lines[i + searchLines.length - 1]?.length ?? 0) + 1,
            };
        }
    }

    return null;
}

export function createDeepSeekProvider(config: DeepSeekProviderConfig = {}): AIProvider {
    const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    const apiKey = config.apiKey ?? '';
    const model = config.model ?? DEFAULT_MODEL;

    return {
        async *send(params: AIProviderSendParams): AsyncGenerator<AIProviderChunk> {
            const systemPrompt = buildSystemPrompt(params.mode);
            const userMessage = buildUserMessage(params);

            const messages = [
                { role: 'system' as const, content: systemPrompt },
                ...params.history
                    .filter((m) => m.role === 'user' || m.role === 'assistant')
                    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
                { role: 'user' as const, content: userMessage },
            ];

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            const response = await fetch(baseUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model,
                    messages,
                    temperature: 0.3,
                    stream: true,
                    apiKey: apiKey || undefined,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let buffer = '';
            let fullText = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() ?? '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || !trimmed.startsWith('data: ')) continue;

                        const data = trimmed.slice(6);
                        if (data === '[DONE]') break;

                        try {
                            const parsed = JSON.parse(data);
                            const delta = parsed.choices?.[0]?.delta?.content;
                            if (delta) {
                                fullText += delta;
                                yield { type: 'text', content: delta };
                            }
                        } catch {
                            // Skip malformed JSON chunks
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }

            // Parse edit blocks from the complete response (only in agent/auto modes)
            if (params.mode === 'agent' || params.mode === 'auto') {
                const edits = parseEditBlocks(fullText);

                if (edits.length > 0) {
                    // Found edit blocks - apply them
                    for (const edit of edits) {
                        const range = findEditRange(params.documentContent, edit.oldText);
                        if (range) {
                            yield {
                                type: 'edit',
                                change: {
                                    range,
                                    oldText: edit.oldText,
                                    newText: edit.newText,
                                    summary: `AI edit at L${range.startLine}-${range.endLine}`,
                                },
                            };
                        } else {
                            // If edit block found but no match in document,
                            // treat as full replacement if document is empty or small
                            if (params.documentContent.trim().length === 0) {
                                const lines = edit.newText.split('\n');
                                yield {
                                    type: 'edit',
                                    change: {
                                        range: {
                                            startLine: 1,
                                            startColumn: 1,
                                            endLine: Math.max(1, lines.length),
                                            endColumn: (lines[lines.length - 1]?.length ?? 0) + 1,
                                        },
                                        oldText: params.documentContent,
                                        newText: edit.newText,
                                        summary: 'AI: 新增内容',
                                    },
                                };
                            }
                        }
                    }
                } else {
                    // No edit blocks found - check for code blocks as fallback
                    const codeBlocks = extractCodeBlocks(fullText);
                    if (codeBlocks.length > 0 && params.documentContent.trim().length === 0) {
                        // Document is empty, use the first code block as new content
                        const block = codeBlocks[0];
                        if (block) {
                            const lines = block.code.split('\n');
                            yield {
                                type: 'edit',
                                change: {
                                    range: {
                                        startLine: 1,
                                        startColumn: 1,
                                        endLine: Math.max(1, lines.length),
                                        endColumn: (lines[lines.length - 1]?.length ?? 0) + 1,
                                    },
                                    oldText: '',
                                    newText: block.code,
                                    summary: `AI: 创建 ${block.language || '代码'}`,
                                },
                            };
                        }
                    }
                }
            }
        },
    };
}
