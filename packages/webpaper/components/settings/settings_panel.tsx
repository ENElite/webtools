import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { Button, Modal, Typography } from 'antd';
import Moveable from 'react-moveable';

import { SettingsDynamicForm } from './dynamic_form';
import { useMaximize } from './useMaximize';
import type { SettingsSchema, SettingsValues } from './schema';

type SettingsPanelProps<TValues extends SettingsValues = SettingsValues> = {
    panelKey: string | number;
    title: string;
    value: TValues;
    schema: SettingsSchema<TValues>;
    container: HTMLElement;
    onChange: (next: TValues) => void;
    onClose: () => void;
    onSave?: (next: TValues) => void;
    emptyState?: ReactNode;
};

type HistoryState<TValues extends SettingsValues> = {
    past: TValues[];
    future: TValues[];
};

function cloneValue<TValues extends SettingsValues>(value: TValues): TValues {
    return { ...value };
}

function valuesEqual<TValues extends SettingsValues>(a: TValues, b: TValues): boolean {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) {
        return false;
    }

    for (const key of aKeys) {
        if (a[key] !== b[key]) {
            return false;
        }
    }

    return true;
}

export function SettingsFormPanel<TValues extends SettingsValues>({
    panelKey,
    title,
    value,
    schema,
    container,
    onChange,
    onClose,
    onSave,
    emptyState,
}: SettingsPanelProps<TValues>) {
    const [panelHostElement, setPanelHostElement] = useState<HTMLDivElement | null>(null);
    const [headerElement, setHeaderElement] = useState<HTMLElement | null>(null);
    const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
    const moveableRef = useRef<Moveable | null>(null);

    const [draftValues, setDraftValues] = useState<TValues>(() => cloneValue(value));
    const [savedValues, setSavedValues] = useState<TValues>(() => cloneValue(value));
    const [historyState, setHistoryState] = useState<HistoryState<TValues>>({
        past: [],
        future: [],
    });
    const initialValuesRef = useRef<TValues>(cloneValue(value));

    const resetPanelState = (nextValue: TValues) => {
        const nextDraft = cloneValue(nextValue);
        initialValuesRef.current = cloneValue(nextDraft);
        setDraftValues(nextDraft);
        setSavedValues(cloneValue(nextDraft));
        setHistoryState({ past: [], future: [] });
        setCloseConfirmOpen(false);
    };

    useEffect(() => {
        resetPanelState(value);
    }, [panelKey]);

    const commitDraft = (nextDraft: TValues) => {
        if (valuesEqual(draftValues, nextDraft)) {
            return;
        }

        setHistoryState((current) => ({
            past: [...current.past, cloneValue(draftValues)],
            future: [],
        }));

        const nextValue = cloneValue(nextDraft);
        setDraftValues(nextValue);
        onChange(nextValue);
    };

    const undo = () => {
        setHistoryState((current) => {
            const previous = current.past[current.past.length - 1];
            if (!previous) {
                return current;
            }

            const nextFuture = [cloneValue(draftValues), ...current.future];
            const nextDraft = cloneValue(previous);
            setDraftValues(nextDraft);
            onChange(nextDraft);

            return {
                past: current.past.slice(0, -1),
                future: nextFuture,
            };
        });
    };

    const redo = () => {
        setHistoryState((current) => {
            const next = current.future[0];
            if (!next) {
                return current;
            }

            const nextDraft = cloneValue(next);
            setDraftValues(nextDraft);
            onChange(nextDraft);

            return {
                past: [...current.past, cloneValue(draftValues)],
                future: current.future.slice(1),
            };
        });
    };

    const resetToInitial = () => {
        const initialValues = initialValuesRef.current;
        if (valuesEqual(draftValues, initialValues)) {
            return;
        }

        setHistoryState((current) => ({
            past: [...current.past, cloneValue(draftValues)],
            future: [],
        }));

        const nextDraft = cloneValue(initialValues);
        setDraftValues(nextDraft);
        onChange(nextDraft);
    };

    const save = () => {
        const nextSaved = cloneValue(draftValues);
        setSavedValues(nextSaved);
        onSave?.(nextSaved);
    };

    const saveAndClose = () => {
        save();
        onClose();
    };

    const discardAndClose = () => {
        onClose();
    };

    const closeWithoutSave = () => {
        onClose();
    };

    const isDirty = useMemo(() => !valuesEqual(draftValues, savedValues), [draftValues, savedValues]);
    const canUndo = historyState.past.length > 0;
    const canRedo = historyState.future.length > 0;

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const isMeta = event.ctrlKey || event.metaKey;
            if (!isMeta) {
                return;
            }

            if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
                event.preventDefault();
                undo();
                return;
            }

            if ((event.key.toLowerCase() === 'z' && event.shiftKey) || event.key.toLowerCase() === 'y') {
                event.preventDefault();
                redo();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [redo, undo]);

    const requestClose = () => {
        if (!isDirty) {
            closeWithoutSave();
            return;
        }

        setCloseConfirmOpen(true);
    };

    const { maximized, toggle } = useMaximize({
        target: panelHostElement,
        container,
        moveableRef,
    });

    return (
        <>
            <Modal
                getContainer={() => container || document.body}
                panelRef={setPanelHostElement}
                open
                className='left-0 top-0 overflow-hidden'
                width={760}
                centered
                style={{
                    height: '550px',
                    minWidth: '450px',
                }}
                styles={{
                    container: {
                        height: '100%',
                    },
                    body: {
                        minHeight: 0,
                        padding: 0,
                        height: '100%',
                        paddingBottom: 30,
                    },
                }}
                mask={{
                    closable: true,
                }}
                keyboard={false}
                destroyOnHidden
                footer={null}
                closable={false}
                onCancel={requestClose}
                title={(
                    <div
                        ref={setHeaderElement}
                        className='flex items-center justify-between gap-3 py-1 cursor-move select-none'
                    >
                        <Typography.Text strong className='text-sm'>
                            {title}
                        </Typography.Text>
                        <div className='flex items-center gap-1'>
                            <Button
                                type='text'
                                size='small'
                                title={maximized ? '还原' : '最大化'}
                                onClick={toggle}
                            >
                                <span
                                    aria-hidden='true'
                                    className={`inline-block h-4 w-4 ${maximized ? 'icon-[octicon--screen-normal-16]' : 'icon-[octicon--screen-full-16]'}`}
                                />
                            </Button>
                            <Button type='text' size='small' title='Reset 回滚到初始快照' onClick={resetToInitial}>
                                <span aria-hidden='true' className='inline-block h-4 w-4 icon-[octicon--history-16]' />
                            </Button>
                            <Button type='text' size='small' title='撤销 Ctrl+Z' disabled={!canUndo} onClick={undo}>
                                <span aria-hidden='true' className='inline-block h-4 w-4 icon-[octicon--arrow-left-16]' />
                            </Button>
                            <Button type='text' size='small' title='重做 Ctrl+Shift+Z / Ctrl+Y' disabled={!canRedo} onClick={redo}>
                                <span aria-hidden='true' className='inline-block h-4 w-4 icon-[octicon--arrow-right-16]' />
                            </Button>
                            <Button type='text' size='small' title='保存当前' onClick={save}>
                                <span aria-hidden='true' className='inline-block h-4 w-4 icon-[octicon--bookmark-16]' />
                            </Button>
                            <Button type='text' size='small' title='保存并退出' onClick={saveAndClose}>
                                <span aria-hidden='true' className='inline-block h-4 w-4 icon-[octicon--check-16]' />
                            </Button>
                            <Button type='text' size='small' title='退出' onClick={requestClose}>
                                <span aria-hidden='true' className='inline-block h-4 w-4 icon-[octicon--x-16]' />
                            </Button>
                        </div>
                    </div>
                )}
            >
                {schema.length > 0
                    ? (
                        <SettingsDynamicForm
                            value={draftValues}
                            schema={schema}
                            onChange={(nextDraft) => {
                                commitDraft(nextDraft);
                            }}
                        />
                    )
                    : emptyState ?? (
                        <div className='flex items-center justify-center w-full h-full text-gray-400'>
                            无法加载设置面板
                        </div>
                    )}
            </Modal>

            <Moveable
                ref={moveableRef}
                target={panelHostElement}
                draggable
                resizable={!maximized}
                dragTarget={headerElement}
                keepRatio={false}
                origin={false}
                edge
                hideDefaultLines
                useMutationObserver
                useResizeObserver
                container={container}
                renderDirections={[]}
                snappable
                snapDirections={{ left: true, top: true, right: true, bottom: true, center: true, middle: true }}
                bounds={{ position: 'css', left: 0, top: 0, right: 0, bottom: 0 }}
                onDrag={({ target, transform }) => {
                    target.style.transform = transform;
                }}
                onResize={({ target, width: nextWidth, height: nextHeight, drag }) => {
                    target.style.width = `${nextWidth}px`;
                    target.style.height = `${nextHeight}px`;
                    target.style.transform = drag.transform;
                }}
            />

            <Modal
                open={closeConfirmOpen}
                title='未保存更改'
                onCancel={() => setCloseConfirmOpen(false)}
                mask={{
                    closable: false,
                }}
                keyboard={false}
                footer={[
                    <Button key='continue' onClick={() => setCloseConfirmOpen(false)}>
                        继续编辑
                    </Button>,
                    <Button
                        key='discard'
                        danger
                        onClick={() => {
                            setCloseConfirmOpen(false);
                            discardAndClose();
                        }}
                    >
                        不保存并退出
                    </Button>,
                    <Button
                        key='save-and-exit'
                        type='primary'
                        onClick={() => {
                            setCloseConfirmOpen(false);
                            saveAndClose();
                        }}
                    >
                        保存并退出
                    </Button>,
                ]}
            >
                检测到未保存的修改，是否保存后退出？
            </Modal>
        </>
    );
}