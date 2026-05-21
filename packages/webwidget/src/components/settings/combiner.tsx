import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Button, Form, Popover, Select, Space, Tooltip } from 'antd';

export type CombinerOperator = 'gte' | 'eq' | 'lte' | string;

export type CombinerValue = string | number;

export type CombinerOption = {
    label: string;
    value: string | number;
};

type CombinerPickerProps = {
    /**
     * Current state: operator value or null if disabled
     */
    operatorValue: CombinerOperator | null;
    /**
     * Current value
     */
    valueValue: CombinerValue | null;
    /**
     * Operator options (e.g., ['gte', 'eq', 'lte'])
     */
    operatorOptions: CombinerOption[];
    /**
     * Value options (e.g., widths, heights)
     */
    valueOptions: CombinerOption[];
    /**
     * Operator label (e.g., '宽度')
     */
    label: string;
    /**
     * Callback when user confirms selection
     * Returns false to revert changes (validation failed)
     */
    onChange: (operator: CombinerOperator | null, value: CombinerValue | null) => boolean;
    /**
     * When true, disable the operator/value selects in popover
     */
    disabled?: boolean;
};

/**
 * CombinerPicker: Popover-based operator + value selector
 * Similar to FontPicker but for selecting operator (gte/eq/lte) + value (width/height)
 * Returns false from onChange to revert last change (invalid selection)
 */
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
            // 打开时重置草稿
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
                    <div style={{ marginBottom: 8, fontSize: 12, color: '#666' }}>当前状态：{displayText}</div>
                    <Space.Compact style={{ width: '100%' }}>
                        <Select
                            style={{ width: 120 }}
                            value={draftRef.current.operator || 'eq'}
                            options={operatorOptions}
                            disabled={disabled || draftRef.current.operator === null}
                            onChange={handleOperatorChange}
                            placeholder="操作符"
                        />
                        <Select
                            style={{ flex: 1 }}
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
