import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Button, Form, Popover, Select, Space, Tooltip } from 'antd';
import type { EditorProps } from '../registry';

export type CombinerOperator = 'gte' | 'eq' | 'lte' | string;

export type CombinerValue = string | number;

export type CombinerOption = {
    label: string;
    value: string | number;
};

type CombinerPickerProps = {
    operatorValue: CombinerOperator | null;
    valueValue: CombinerValue | null;
    operatorOptions: CombinerOption[];
    valueOptions: CombinerOption[];
    label: string;
    onChange: (operator: CombinerOperator | null, value: CombinerValue | null) => boolean;
    disabled?: boolean;
};

export function CombinerPicker({
    operatorValue,
    valueValue,
    operatorOptions,
    valueOptions,
    label,
    onChange,
    disabled,
}: CombinerPickerProps) {
    const [open, setOpen] = useState(false);
    const draftRef = useRef<{ operator: CombinerOperator | null; value: CombinerValue | null }>({
        operator: operatorValue,
        value: valueValue,
    });

    const isActive = operatorValue !== null;

    const handleOpenChange = useCallback((nextOpen: boolean) => {
        setOpen(nextOpen);
        if (nextOpen) {
            draftRef.current = {
                operator: operatorValue,
                value: valueValue,
            };
        }
    }, [operatorValue, valueValue]);

    const handleOperatorChange = (nextOperator: CombinerOperator) => {
        const prevDraft = { ...draftRef.current };
        draftRef.current.operator = nextOperator;

        const isValid = onChange(draftRef.current.operator, draftRef.current.value);
        if (!isValid) {
            draftRef.current = prevDraft;
        }
    };

    const handleValueChange = (nextValue: CombinerValue) => {
        const prevDraft = { ...draftRef.current };
        draftRef.current.value = nextValue;

        const isValid = onChange(draftRef.current.operator, draftRef.current.value);
        if (!isValid) {
            draftRef.current = prevDraft;
        }
    };

    const handleEnable = () => {
        const defaultOperator = (operatorOptions[0]?.value as CombinerOperator) || 'eq';
        const defaultValue = valueOptions[0]?.value || '';
        draftRef.current = { operator: defaultOperator, value: defaultValue };

        const isValid = onChange(defaultOperator, defaultValue);
        if (!isValid) {
            draftRef.current = { operator: null, value: null };
        }
    };

    const handleClear = () => {
        const prevDraft = { ...draftRef.current };
        draftRef.current = { operator: null, value: null };

        const isValid = onChange(null, null);
        if (!isValid) {
            draftRef.current = prevDraft;
        } else {
            setOpen(false);
        }
    };

    const displayText = useMemo(() => {
        if (!isActive) return '未启用';
        return `${draftRef.current.operator} : ${draftRef.current.value}`;
    }, [isActive]);

    const content = (
        <div className='w-80 max-w-[calc(100vw-32px)]'>
            <Form layout='vertical' colon={false} className='gap-3'>
                <div>
                    <div className='mb-2 text-xs text-slate-500'>当前状态：{displayText}</div>
                    <Space.Compact className='w-full'>
                        <Select
                            className='w-30'
                            value={draftRef.current.operator || 'eq'}
                            options={operatorOptions}
                            disabled={disabled || draftRef.current.operator === null}
                            onChange={handleOperatorChange}
                            placeholder="操作符"
                        />
                        <Select
                            className='flex-1'
                            value={draftRef.current.value || undefined}
                            options={valueOptions}
                            disabled={disabled || draftRef.current.operator === null}
                            onChange={handleValueChange}
                            placeholder="选择数值"
                        />
                    </Space.Compact>
                </div>

                <Space>
                    {!isActive ? (
                        <Button type='primary' size='small' onClick={handleEnable}>
                            启用
                        </Button>
                    ) : (
                        <Button size='small' onClick={handleClear} danger>
                            清空
                        </Button>
                    )}
                </Space>
            </Form>
        </div>
    );

    return (
        <Popover
            trigger='click'
            placement='bottomLeft'
            open={open}
            onOpenChange={handleOpenChange}
            content={content}
            destroyOnHidden
        >
            <Tooltip title={`点击编辑 ${label}筛选`}>
                <Button className='w-full justify-start text-left' type={isActive ? 'primary' : 'default'}>
                    <span className='flex items-center gap-2 w-full'>
                        <span className='text-sm'>{label}</span>
                        <span className='block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-slate-600'>
                            {displayText}
                        </span>
                    </span>
                </Button>
            </Tooltip>
        </Popover>
    );
}

export default function CombinerEditor({ item, value, onChange }: EditorProps) {
    const meta = item.meta ?? {};
    const bind = item.bind as string[];
    const operatorKey = bind[0] ?? meta['operatorKey'] as string;
    const valueKey = bind[1] ?? meta['valueKey'] as string;
    const operatorValue = value[operatorKey] as CombinerOperator | null | undefined;
    const combinerValue = value[valueKey] as CombinerValue | null | undefined;

    return (
        <CombinerPicker
            operatorValue={operatorValue ?? null}
            valueValue={combinerValue ?? null}
            operatorOptions={(meta['operatorOptions'] as Array<{ label: string; value: string | number }>) ?? []}
            valueOptions={(meta['valueOptions'] as Array<{ label: string; value: string | number }>) ?? []}
            label={item.label ?? item.key}
            onChange={(nextOperator, nextValue) => {
                onChange({
                    set: {
                        [operatorKey]: nextOperator ?? '',
                        [valueKey]: nextValue ?? '',
                    },
                });
                return true;
            }}
        />
    );
}
