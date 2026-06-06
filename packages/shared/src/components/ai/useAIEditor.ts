import { useCallback, useRef, useState } from 'react';
import type { AIEditChange, AIMessage, AIMode, AIProvider, EditorSelection } from './types';

let nextMessageId = 0;
let nextChangeId = 0;

function createId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${(nextMessageId++).toString(36)}`;
}

export type UseAIEditorReturn = {
    messages: AIMessage[];
    pendingChanges: AIEditChange[];
    mode: AIMode;
    requesting: boolean;
    selection: EditorSelection;

    setMode: (mode: AIMode) => void;
    setSelection: (selection: EditorSelection) => void;
    send: (content: string, documentContent: string) => Promise<void>;
    acceptChange: (changeId: string) => void;
    rejectChange: (changeId: string) => void;
    acceptAll: () => void;
    rejectAll: () => void;
    clearMessages: () => void;
};

export function useAIEditor(provider: AIProvider | undefined): UseAIEditorReturn {
    const [messages, setMessages] = useState<AIMessage[]>([]);
    const [pendingChanges, setPendingChanges] = useState<AIEditChange[]>([]);
    const [mode, setMode] = useState<AIMode>('agent');
    const [requesting, setRequesting] = useState(false);
    const [selection, setSelection] = useState<EditorSelection>(null);
    const messagesRef = useRef<AIMessage[]>([]);

    const send = useCallback(async (content: string, documentContent: string) => {
        if (!provider || requesting || !content.trim()) return;

        const trimmed = content.trim();

        // Add user message
        const userMsg: AIMessage = {
            id: createId('msg'),
            role: 'user',
            content: trimmed,
            timestamp: Date.now(),
            quote: selection ? {
                text: selection.text,
                startLine: selection.startLine,
                endLine: selection.endLine,
            } : undefined,
        };

        setMessages((prev) => {
            const next = [...prev, userMsg];
            messagesRef.current = next;
            return next;
        });
        setRequesting(true);

        let assistantContent = '';

        try {
            const stream = provider.send({
                content: trimmed,
                mode,
                selection: selection ?? undefined,
                documentContent,
                history: messagesRef.current,
            });

            for await (const chunk of stream) {
                if (chunk.type === 'text') {
                    assistantContent += chunk.content;
                    // Update the last assistant message or create one
                    setMessages((prev) => {
                        const last = prev[prev.length - 1];
                        if (last && last.role === 'assistant' && last.id.startsWith('msg-stream')) {
                            return [
                                ...prev.slice(0, -1),
                                { ...last, content: assistantContent },
                            ];
                        }
                        return [
                            ...prev,
                            {
                                id: 'msg-stream',
                                role: 'assistant' as const,
                                content: assistantContent,
                                timestamp: Date.now(),
                            },
                        ];
                    });
                } else if (chunk.type === 'edit') {
                    const change: AIEditChange = {
                        id: `change-${++nextChangeId}`,
                        range: chunk.change.range,
                        oldText: chunk.change.oldText,
                        newText: chunk.change.newText,
                        summary: chunk.change.summary,
                        status: 'pending',
                    };
                    setPendingChanges((prev) => [...prev, change]);
                }
            }

            // Finalize the assistant message
            if (assistantContent) {
                setMessages((prev) => {
                    const last = prev[prev.length - 1];
                    if (last && last.id === 'msg-stream') {
                        return [
                            ...prev.slice(0, -1),
                            { ...last, id: createId('msg'), timestamp: Date.now() },
                        ];
                    }
                    return prev;
                });
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            setMessages((prev) => [
                ...prev,
                {
                    id: createId('msg'),
                    role: 'assistant',
                    content: `请求失败: ${errorMsg}`,
                    timestamp: Date.now(),
                },
            ]);
        } finally {
            setRequesting(false);
        }
    }, [provider, requesting, mode, selection]);

    const acceptChange = useCallback((changeId: string) => {
        setPendingChanges((prev) =>
            prev.map((c) => c.id === changeId ? { ...c, status: 'accepted' as const } : c),
        );
    }, []);

    const rejectChange = useCallback((changeId: string) => {
        setPendingChanges((prev) =>
            prev.map((c) => c.id === changeId ? { ...c, status: 'rejected' as const } : c),
        );
    }, []);

    const acceptAll = useCallback(() => {
        setPendingChanges((prev) =>
            prev.map((c) => c.status === 'pending' ? { ...c, status: 'accepted' as const } : c),
        );
    }, []);

    const rejectAll = useCallback(() => {
        setPendingChanges((prev) =>
            prev.map((c) => c.status === 'pending' ? { ...c, status: 'rejected' as const } : c),
        );
    }, []);

    const clearMessages = useCallback(() => {
        setMessages([]);
        messagesRef.current = [];
        setPendingChanges([]);
    }, []);

    return {
        messages,
        pendingChanges,
        mode,
        requesting,
        selection,
        setMode,
        setSelection,
        send,
        acceptChange,
        rejectChange,
        acceptAll,
        rejectAll,
        clearMessages,
    };
}
