export type AIMode = 'ask' | 'agent' | 'plan' | 'auto';

export type AIMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    quote?: {
        text: string;
        startLine: number;
        endLine: number;
    };
};

export type AIEditChange = {
    id: string;
    range: {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
    };
    oldText: string;
    newText: string;
    summary?: string;
    status: 'pending' | 'accepted' | 'rejected';
};

export type AIProviderSendParams = {
    content: string;
    mode: AIMode;
    selection?: {
        text: string;
        startLine: number;
        endLine: number;
    };
    documentContent: string;
    history: AIMessage[];
};

export type AIProviderChunk =
    | { type: 'text'; content: string }
    | {
        type: 'edit';
        change: Omit<AIEditChange, 'id' | 'status'>;
    };

export type AIProvider = {
    send(params: AIProviderSendParams): AsyncGenerator<AIProviderChunk>;
};

export type EditorSelection = {
    text: string;
    startLine: number;
    endLine: number;
    startColumn: number;
    endColumn: number;
} | null;
