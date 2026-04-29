import React, { useState } from 'react';

import { Button, Card, Collapse, Input, Space, Tag, Typography } from 'antd';

import type { AutoEditorHandle } from './auto_editor';
import { useAgent, type UseAgentConfig } from './use_agent';
import { useEditorTools } from './use_editor_tools';

const DEFAULT_SYSTEM_PROMPT = `你是一个代码编辑助手，当前工作在 Monaco 编辑器环境。
你可以调用两个工具：
1) editor_search: 在当前文档里搜索文本。
2) editor_modify: 根据给定范围修改文本。
3) editor_read: 读取 Monaco 文档内容, 默认为前 100 行，不足时读取全文。

行为要求：
- 优先先搜索再修改，避免盲改。
- 当用户请求修改代码时，尽量给出最小改动。
- 修改完成后，简洁说明你做了什么。
- 仅在确实需要时才调用工具。`;

export type AgentDialogProps = {
    editorRef: React.RefObject<AutoEditorHandle | null>;
    currentCode: string;
    onCodeChange: (newCode: string) => void;
};

export function AgentDialog({ editorRef, currentCode, onCodeChange }: AgentDialogProps) {
    const [chatInput, setChatInput] = useState('');
    const [config, setConfig] = useState<UseAgentConfig>({
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        baseUrl: '/api/deepseek',
        apiKey: '',
        model: 'deepseek-reasoner',
    });

    const editorTools = useEditorTools({
        editorRef,
        currentCode,
        onCodeChange,
    });

    const { timelineEntries, requesting, sendMessage } = useAgent(config, editorTools);

    const handleSendMessage = async () => {
        await sendMessage(chatInput);
        setChatInput('');
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, gap: 8 }}>
            <Collapse
                size='small'
                defaultActiveKey={[]}
                items={[
                    {
                        key: 'config',
                        label: 'AI 对话配置',
                        children: (
                            <div style={{ display: 'grid', gap: 8 }}>
                                <Input
                                    value={config.baseUrl}
                                    onChange={(event) => setConfig((current) => ({ ...current, baseUrl: event.target.value }))}
                                    placeholder='API Base URL'
                                />
                                <Input.Password
                                    value={config.apiKey}
                                    onChange={(event) => setConfig((current) => ({ ...current, apiKey: event.target.value }))}
                                    placeholder='API Key'
                                />
                                <Input
                                    value={config.model}
                                    onChange={(event) => setConfig((current) => ({ ...current, model: event.target.value }))}
                                    placeholder='Model'
                                />
                                <Input.TextArea
                                    value={config.systemPrompt}
                                    onChange={(event) => setConfig((current) => ({ ...current, systemPrompt: event.target.value }))}
                                    rows={5}
                                    placeholder='System prompt'
                                />
                            </div>
                        ),
                    },
                ]}
            />

            <Card
                size='small'
                title='对话记录'
                extra={<Tag color={requesting ? 'processing' : 'success'}>{requesting ? '请求中' : '就绪'}</Tag>}
                styles={{ body: { display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, overflow: 'auto' } }}
                style={{ flex: 1, minHeight: 0 }}
            >
                {timelineEntries.length === 0
                    ? <Typography.Text type='secondary'>输入需求后，AI 会调用 Monaco 工具执行修改。</Typography.Text>
                    : timelineEntries.map((item) => {
                        if (item.kind === 'message') {
                            return (
                                <Card key={item.id} size='small' type='inner' title={item.role === 'user' ? '你' : 'Agent'}>
                                    <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                                        {item.content}
                                    </Typography.Paragraph>
                                </Card>
                            );
                        }

                        return (
                            <Collapse
                                key={item.id}
                                size='small'
                                items={[
                                    {
                                        key: item.id,
                                        label: (
                                            <Space>
                                                <Typography.Text>{item.name}</Typography.Text>
                                                <Tag color={item.status === 'done' ? 'success' : item.status === 'error' ? 'error' : 'processing'}>
                                                    {item.status}
                                                </Tag>
                                            </Space>
                                        ),
                                        children: (
                                            <div style={{ display: 'grid', gap: 6 }}>
                                                <Typography.Text type='secondary'>args: {JSON.stringify(item.args)}</Typography.Text>
                                                <Typography.Text type='secondary'>output: {item.output || '...'}</Typography.Text>
                                            </div>
                                        ),
                                    },
                                ]}
                            />
                        );
                    })}
            </Card>

            <Card size='small' title='发送消息' styles={{ body: { display: 'grid', gap: 8 } }}>
                <Input.TextArea
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    placeholder='描述你的修改目标，AI 会先搜索再编辑...'
                    autoSize={{ minRows: 3, maxRows: 8 }}
                    onPressEnter={(event) => {
                        if (!event.shiftKey) {
                            event.preventDefault();
                            void handleSendMessage();
                        }
                    }}
                />
                <Button type='primary' onClick={() => void handleSendMessage()} loading={requesting}>
                    发送
                </Button>
            </Card>
        </div>
    );
}