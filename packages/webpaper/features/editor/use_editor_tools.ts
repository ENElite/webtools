import { useMemo } from 'react';
import { tool } from '@langchain/core/tools';
import type { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

import type { AutoEditorHandle } from './auto_editor';

function indexFromLineColumn(text: string, line: number, column: number): number {
    if (!Number.isInteger(line) || !Number.isInteger(column) || line < 1 || column < 1) {
        return -1;
    }

    let currentLine = 1;
    let currentColumn = 1;

    for (let index = 0; index < text.length; index += 1) {
        if (currentLine === line && currentColumn === column) {
            return index;
        }

        if (text[index] === '\n') {
            currentLine += 1;
            currentColumn = 1;
        } else {
            currentColumn += 1;
        }
    }

    if (currentLine === line && currentColumn === column) {
        return text.length;
    }

    return -1;
}

function lineColumnFromIndex(text: string, targetIndex: number): { line: number; column: number } {
    const safeIndex = Math.max(0, Math.min(targetIndex, text.length));
    let line = 1;
    let column = 1;

    for (let index = 0; index < safeIndex; index += 1) {
        if (text[index] === '\n') {
            line += 1;
            column = 1;
        } else {
            column += 1;
        }
    }

    return { line, column };
}

export type UseEditorToolsOptions = {
    editorRef: React.RefObject<AutoEditorHandle | null>;
    currentCode: string;
    onCodeChange: (newCode: string) => void;
};

export function useEditorTools(options: UseEditorToolsOptions): StructuredTool[] {
    return useMemo(() => {
        const searchTool = tool(async (input) => {
            const current = options.editorRef.current?.getContent() ?? options.currentCode;
            const maxResults = Math.max(1, Math.min(input.maxResults ?? 20, 50));

            if (!input.query.trim()) {
                return JSON.stringify({
                    ok: false,
                    message: 'query 不能为空。',
                });
            }

            const matches: Array<{ line: number; column: number; snippet: string }> = [];
            const lowerText = current.toLowerCase();
            const lowerQuery = input.query.toLowerCase();
            let cursor = 0;

            while (matches.length < maxResults) {
                const foundIndex = lowerText.indexOf(lowerQuery, cursor);
                if (foundIndex < 0) {
                    break;
                }

                const position = lineColumnFromIndex(current, foundIndex);
                const lineStart = current.lastIndexOf('\n', foundIndex - 1) + 1;
                const lineEndRaw = current.indexOf('\n', foundIndex);
                const lineEnd = lineEndRaw < 0 ? current.length : lineEndRaw;
                const snippet = current.slice(lineStart, lineEnd).trim();

                matches.push({
                    line: position.line,
                    column: position.column,
                    snippet,
                });

                cursor = foundIndex + lowerQuery.length;
            }

            return JSON.stringify({
                ok: true,
                query: input.query,
                total: matches.length,
                results: matches,
            });
        }, {
            name: 'editor_search',
            description: '在当前 Monaco 文档中按关键字搜索，返回匹配位置和所在行文本。',
            schema: z.object({
                query: z.string().min(1),
                maxResults: z.number().int().min(1).max(50).optional(),
            }),
        });

        const modifyTool = tool(async (input) => {
            const current = options.editorRef.current?.getContent() ?? options.currentCode;
            const startIndex = indexFromLineColumn(current, input.startLine, input.startColumn);
            const endIndex = indexFromLineColumn(current, input.endLine, input.endColumn);

            if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) {
                return JSON.stringify({
                    ok: false,
                    message: '编辑范围无效，请先调用 editor_search 获取准确坐标。',
                });
            }

            const next = `${current.slice(0, startIndex)}${input.newText}${current.slice(endIndex)}`;
            options.editorRef.current?.writeContent(next);
            options.onCodeChange(next);

            const appliedEnd = lineColumnFromIndex(next, startIndex + input.newText.length);
            return JSON.stringify({
                ok: true,
                message: input.summary ?? '已应用编辑。',
                range: {
                    start: { line: input.startLine, column: input.startColumn },
                    end: { line: input.endLine, column: input.endColumn },
                },
                appliedEnd,
            });
        }, {
            name: 'editor_modify',
            description: '按行列范围修改 Monaco 文档文本，范围为 1-based，结束坐标为开区间。',
            schema: z.object({
                startLine: z.number().int().min(1),
                startColumn: z.number().int().min(1),
                endLine: z.number().int().min(1),
                endColumn: z.number().int().min(1),
                newText: z.string(),
                summary: z.string().optional(),
            }),
        });

        const readTool = tool(async (input) => {
            const current = options.editorRef.current?.getContent() ?? options.currentCode;
            const startIndex = indexFromLineColumn(current, input.startLine, 1);
            const endIndex = indexFromLineColumn(current, input.endLine, 1);
            const content = endIndex !== -1 ? current.slice(startIndex, endIndex) : current.slice(startIndex);

            return JSON.stringify({
                ok: true,
                content,
            });
        }, {
            name: 'editor_read',
            description: '读取 Monaco 文档内容。',
            schema: z.object({
                startLine: z.number().int().min(1).default(1),
                endLine: z.number().int().min(1).default(100),
            }),
        });

        return [searchTool, modifyTool, readTool];
    }, [options.currentCode, options.onCodeChange, options.editorRef]);
}