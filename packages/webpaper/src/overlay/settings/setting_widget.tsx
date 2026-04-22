import { useMemo, useState } from 'react';

import { Button, Modal, Typography } from 'antd';

import { WidgetDynamicForm } from './widget_dynamic_form';
import { resolveWidgetSettingsSchema } from './registry';
import type { WidgetSettingsSchema, SettingsWidgetProps } from './schema';
import type {
    WidgetFlatProps,
    WidgetModel,
    WidgetPropPrimitive,
    WidgetableActionEvent,
    WidgetRendererProps,
} from '../types';
import { parseTransformString } from '../transform_utils';

type SettingWidgetRendererProps = WidgetRendererProps<WidgetFlatProps> & {
    onWidgetableAction?: (event: WidgetableActionEvent) => void;
    sourceWidget?: WidgetModel | null;
    overlayBounds?: { width: number; height: number } | null;
};

type WidgetSettingsDraft = Record<string, WidgetPropPrimitive>;

function parseDraftValues(raw: string): WidgetSettingsDraft {
    try {
        return JSON.parse(raw) as WidgetSettingsDraft;
    } catch {
        return {};
    }
}

function buildInitialDraft(widget: WidgetModel): WidgetSettingsDraft {
    const { x, y, rotation } = parseTransformString(widget.style.transform);
    const width = Number.parseFloat(widget.style.width) || 0;
    const height = Number.parseFloat(widget.style.height) || 0;
    const borderRadius = Number.parseFloat(widget.style.borderRadius) || 0;

    return {
        ...widget.props,
        width,
        height,
        x,
        y,
        rotation,
        borderRadius,
    };
}

export function SettingWidget({
    widget,
    onWidgetableAction,
    sourceWidget,
    overlayBounds,
}: SettingWidgetRendererProps) {
    const settingsProps = widget.props as unknown as SettingsWidgetProps;

    const initialDraft = useMemo(() => {
        if (sourceWidget) {
            return buildInitialDraft(sourceWidget);
        }
        return parseDraftValues(settingsProps.draftValues);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const [draftValues, setDraftValues] = useState<WidgetSettingsDraft>(initialDraft);
    const [confirmState, setConfirmState] = useState<'idle' | 'confirming'>('idle');

    const schema = useMemo((): WidgetSettingsSchema | null => {
        if (!sourceWidget) {
            return null;
        }

        const resolved = resolveWidgetSettingsSchema(sourceWidget.kind);
        if (!resolved) {
            return null;
        }

        const overlayWidth = overlayBounds?.width ?? Infinity;
        const overlayHeight = overlayBounds?.height ?? Infinity;
        const draftWidth = typeof draftValues['width'] === 'number' ? draftValues['width'] : Number.parseFloat(sourceWidget.style.width) || 0;
        const draftHeight = typeof draftValues['height'] === 'number' ? draftValues['height'] : Number.parseFloat(sourceWidget.style.height) || 0;

        return resolved.map((field) => {
            if (field.type !== 'number') {
                return field;
            }

            if (field.key === 'width') {
                return { ...field, max: Number.isFinite(overlayWidth) ? overlayWidth : field.max };
            }

            if (field.key === 'height') {
                return { ...field, max: Number.isFinite(overlayHeight) ? overlayHeight : field.max };
            }

            if (field.key === 'x') {
                const maxX = Number.isFinite(overlayWidth) ? Math.max(0, overlayWidth - Math.max(0, draftWidth)) : field.max;
                return { ...field, min: 0, max: maxX };
            }

            if (field.key === 'y') {
                const maxY = Number.isFinite(overlayHeight) ? Math.max(0, overlayHeight - Math.max(0, draftHeight)) : field.max;
                return { ...field, min: 0, max: maxY };
            }

            return field;
        }) as WidgetSettingsSchema;
    }, [sourceWidget, overlayBounds, draftValues]);

    const isDirty = useMemo(() => {
        return JSON.stringify(draftValues) !== JSON.stringify(initialDraft);
    }, [draftValues, initialDraft]);

    const handleClose = () => {
        if (isDirty) {
            setConfirmState('confirming');
            return;
        }
        onWidgetableAction?.({ type: 'close-settings', widgetId: widget.id });
    };

    const handleSaveAndClose = () => {
        // Commit all pending draft values before closing
        for (const [key, value] of Object.entries(draftValues)) {
            if (draftValues[key] !== initialDraft[key]) {
                onWidgetableAction?.({
                    type: 'commit-settings-field',
                    widgetId: widget.id,
                    key,
                    value,
                });
            }
        }
        setConfirmState('idle');
        onWidgetableAction?.({ type: 'close-settings', widgetId: widget.id });
    };

    const handleDiscardAndClose = () => {
        setConfirmState('idle');
        onWidgetableAction?.({ type: 'close-settings', widgetId: widget.id });
    };

    const handleContinueEditing = () => {
        setConfirmState('idle');
    };

    const handleFieldCommit = (key: string, nextValue: WidgetPropPrimitive) => {
        const nextDraft = { ...draftValues, [key]: nextValue };
        setDraftValues(nextDraft);

        onWidgetableAction?.({
            type: 'commit-settings-field',
            widgetId: widget.id,
            key,
            value: nextValue,
        });
    };

    const handleChange = (next: Record<string, WidgetPropPrimitive>) => {
        setDraftValues(next);
    };

    if (!schema || !sourceWidget) {
        return (
            <div className='flex items-center justify-center w-full h-full text-gray-400'>
                无法加载设置面板
            </div>
        );
    }

    return (
        <div className='w-full h-full'>
            <div className='flex items-center justify-between px-3 py-2'>
                <Typography.Text strong>
                    组件设置
                </Typography.Text>
                <Button type='text' size='small' onClick={handleClose}>
                    <span aria-hidden='true' className={`inline-block h-4 w-4 icon-[octicon--x-16]`} />
                </Button>
            </div>
            <div className='min-h-0 flex-1 overflow-auto p-3'>
                <WidgetDynamicForm
                    value={draftValues}
                    schema={schema}
                    onChange={handleChange}
                    onFieldCommit={handleFieldCommit}
                />
            </div>

            <Modal
                open={confirmState === 'confirming'}
                title='未保存的更改'
                onCancel={handleContinueEditing}
                footer={[
                    <Button key='continue' onClick={handleContinueEditing}>
                        继续编辑
                    </Button>,
                    <Button key='discard' danger onClick={handleDiscardAndClose}>
                        不保存并关闭
                    </Button>,
                    <Button key='save' type='primary' onClick={handleSaveAndClose}>
                        保存并关闭
                    </Button>,
                ]}
            >
                <p>设置项存在未保存的更改，是否保存？</p>
            </Modal>
        </div>
    );
}
