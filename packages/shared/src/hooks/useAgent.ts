import { useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import type { StructuredTool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';

export type ChatRole = 'user' | 'assistant';

export type ChatRecord = {
    id: string;
    role: ChatRole;
    content: string;
    createdAt: number;
};

export type AgentTimelineMessage = ChatRecord & {
    kind: 'message';
};

export type UseAgentConfig = {
    systemPrompt: string;
    baseUrl: string;
    apiKey: string;
    model: string;
};

export type AgentToolCallStatus = 'calling' | 'done' | 'error';

export type AgentToolCallRecord = {
    id: string;
    name: string;
    args: unknown;
    output: string;
    status: AgentToolCallStatus;
    createdAt: number;
};

export type AgentTimelineToolCall = AgentToolCallRecord & {
    kind: 'tool';
};

export type AgentTimelineEntry = AgentTimelineMessage | AgentTimelineToolCall;

export type UseAgentReturn = {
    timelineEntries: AgentTimelineEntry[];
    requesting: boolean;
    sendMessage: (content: string) => Promise<void>;
};

const INTERNAL_PLACEHOLDER_API_KEY = 'no-auth-backend';

function createMessageId(prefix: string): string {
    const random = Math.random().toString(36).slice(2, 8);
    return `${prefix}-${Date.now().toString(36)}-${random}`;
}

function readMessageContent(content: unknown): string {
    if (typeof content === 'string') {
        return content;
    }

    if (Array.isArray(content)) {
        return content
            .map((item) => {
                if (typeof item === 'string') {
                    return item;
                }

                if (item && typeof item === 'object' && 'text' in item && typeof item.text === 'string') {
                    return item.text;
                }

                return '';
            })
            .join('\n')
            .trim();
    }

    return '';
}

function appendChatRecord(
    setter: Dispatch<SetStateAction<ChatRecord[]>>,
    role: ChatRole,
    content: string
) {
    setter((current) => [...current, {
        id: createMessageId(role),
        role,
        content,
        createdAt: Date.now(),
    }]);
}

function toTimelineMessage(record: ChatRecord): AgentTimelineMessage {
    return {
        ...record,
        kind: 'message',
    };
}

function toTimelineToolCall(record: AgentToolCallRecord): AgentTimelineToolCall {
    return {
        ...record,
        kind: 'tool',
    };
}

export function useAgent(
    config: UseAgentConfig,
    tools: StructuredTool[]
): UseAgentReturn {
    const historyRef = useRef<BaseMessage[]>([]);
    const [chatRecords, setChatRecords] = useState<ChatRecord[]>([]);
    const [toolCalls, setToolCalls] = useState<AgentToolCallRecord[]>([]);
    const [requesting, setRequesting] = useState(false);

    const sendMessage = async (content: string) => {
        if (requesting) {
            return;
        }

        const trimmedContent = content.trim();
        if (!trimmedContent) {
            return;
        }

        const apiKey = config.apiKey.trim() || INTERNAL_PLACEHOLDER_API_KEY;

        appendChatRecord(setChatRecords, 'user', trimmedContent);
        setToolCalls([]);
        setRequesting(true);

        try {
            const modelOptions = {
                model: config.model.trim() || 'deepseek-reasoner',
                temperature: 0,
                configuration: {
                    baseURL: config.baseUrl.trim() || undefined,
                },
                apiKey,
            };

            const model = new ChatOpenAI(modelOptions);

            const modelWithTools = model.bindTools(tools);
            const history: BaseMessage[] = [
                new SystemMessage(config.systemPrompt),
                ...historyRef.current,
                new HumanMessage(trimmedContent),
            ];

            let finalAnswer = '';

            for (let step = 0; step < 6; step += 1) {
                const response = await modelWithTools.invoke(history);
                history.push(response);

                const toolCalls = response instanceof AIMessage && Array.isArray(response.tool_calls)
                    ? response.tool_calls
                    : [];

                if (toolCalls.length === 0) {
                    finalAnswer = readMessageContent(response.content) || '已完成处理。';
                    break;
                }

                for (const call of toolCalls) {
                    const callId = call.id ?? createMessageId('tool-call');
                    const targetTool = tools.find((toolItem) => toolItem.name === call.name);

                    setToolCalls((current) => [...current, {
                        id: callId,
                        name: call.name,
                        args: call.args,
                        output: '',
                        status: 'calling',
                        createdAt: Date.now(),
                    }]);

                    let output: string;
                    if (!targetTool) {
                        output = `工具不存在: ${call.name}`;
                        setToolCalls((current) => current.map((item) => {
                            if (item.id !== callId) {
                                return item;
                            }

                            return {
                                ...item,
                                output,
                                status: 'error',
                            };
                        }));
                    } else {
                        try {
                            const toolOutput = await targetTool.invoke(call.args);
                            output = typeof toolOutput === 'string' ? toolOutput : JSON.stringify(toolOutput);
                            setToolCalls((current) => current.map((item) => {
                                if (item.id !== callId) {
                                    return item;
                                }

                                return {
                                    ...item,
                                    output,
                                    status: 'done',
                                };
                            }));
                        } catch (toolError) {
                            const message = toolError instanceof Error ? toolError.message : String(toolError);
                            output = `工具执行失败: ${message}`;
                            setToolCalls((current) => current.map((item) => {
                                if (item.id !== callId) {
                                    return item;
                                }

                                return {
                                    ...item,
                                    output,
                                    status: 'error',
                                };
                            }));
                        }
                    }

                    history.push(new ToolMessage({
                        tool_call_id: callId,
                        content: output,
                    }));
                }
            }

            if (!finalAnswer) {
                finalAnswer = '请求已执行，但没有得到最终回答，请重试。';
            }

            historyRef.current = history.filter((message) => !(message instanceof SystemMessage));
            appendChatRecord(setChatRecords, 'assistant', finalAnswer);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            appendChatRecord(setChatRecords, 'assistant', `请求失败: ${message}`);
        } finally {
            setRequesting(false);
        }
    };

    return {
        timelineEntries: [
            ...chatRecords.map(toTimelineMessage),
            ...toolCalls.map(toTimelineToolCall),
        ].sort((left, right) => left.createdAt - right.createdAt),
        requesting,
        sendMessage,
    };
}
