import { Button, Form, Input, Space, Typography } from 'antd';

import { useMemo } from 'react';

export type JsonProviderSettings = {
    jsonText: string;
};

export const DEFAULT_JSON_SETTINGS: JsonProviderSettings = {
    jsonText: '[]',
};

type Notify = (type: 'success' | 'info' | 'warning' | 'error', message: string, description?: string) => void;

type JsonSettingsPanelProps = {
    value: JsonProviderSettings;
    onChange: (next: JsonProviderSettings) => void;
    notify: Notify;
};

export function buildJsonPreview(settings: JsonProviderSettings): string {
    try {
        const parsed = JSON.parse(settings.jsonText);
        const count = Array.isArray(parsed) ? parsed.length : 0;
        return `JSON 条目数: ${count}`;
    } catch {
        return 'JSON 格式错误';
    }
}

export function JsonSettingsPanel({ value, onChange, notify }: JsonSettingsPanelProps) {
    const preview = useMemo(() => buildJsonPreview(value), [value]);

    return (
        <Space direction='vertical' size='middle' style={{ width: '100%' }}>
            <Typography.Text strong>JSON 设置</Typography.Text>
            <Form layout='vertical'>
                <Form.Item label='JSON 内容（ProviderRecord[]）'>
                    <Input.TextArea
                        value={value.jsonText}
                        rows={10}
                        placeholder='[{"type":"image","provider":"Json","displayUrl":"https://...","previewUrl":"https://...","id":1}]'
                        onChange={(event) => onChange({ ...value, jsonText: event.target.value })}
                    />
                </Form.Item>
                <Space>
                    <Button
                        onClick={() => {
                            onChange(DEFAULT_JSON_SETTINGS);
                            notify('info', 'JSON 设置已重置', '已恢复默认空数组');
                        }}
                    >
                        重置 JSON
                    </Button>
                    <Typography.Text type={preview.includes('错误') ? 'danger' : undefined}>{preview}</Typography.Text>
                </Space>
            </Form>
        </Space>
    );
}
