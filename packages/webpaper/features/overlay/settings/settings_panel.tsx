import { useEffect, useMemo, useState } from 'react';

import Moveable from 'react-moveable';
import { Button, Modal, Typography } from 'antd';

import { Maximizable, toggleMaximizeTarget } from '../maximizable';
import { WidgetDynamicForm } from './widget_dynamic_form';
import { resolveWidgetSettingsSchema } from './schema';
import { useWidgetStore } from './use_widget_store';
import type { WidgetSettingsSchema } from './schema';
import type { WidgetModel } from '../types';

type SettingsPanelProps = {
    sourceWidget: WidgetModel;
    container: HTMLElement;
    onClose: () => void;
};

const DEFERRED_MODEL_KEYS = new Set(['label', 'locked', 'autoHide', 'width', 'height', 'x', 'y', 'rotation']);

export function SettingsPanel({ sourceWidget, container, onClose }: SettingsPanelProps) {
    const [panelHostElement, setPanelHostElement] = useState<HTMLDivElement | null>(null);
    const [headerElement, setHeaderElement] = useState<HTMLElement | null>(null);
    const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
    const [maximized, setMaximized] = useState(false);
    const {
        draftValues,
        isDirty,
        canUndo,
        canRedo,
        commitDraft,
        undo,
        redo,
        resetToInitial,
        save,
        saveAndClose,
        discardAndClose,
        closeWithoutSave,
        applyLivePatch,
    } = useWidgetStore(sourceWidget, onClose);

    useEffect(() => {
        setCloseConfirmOpen(false);
    }, [sourceWidget.id]);

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

    const schema = useMemo((): WidgetSettingsSchema | null => {
        return resolveWidgetSettingsSchema(sourceWidget.kind);
    }, [sourceWidget.kind, draftValues['width'], draftValues['height']]);

    const widgetTitle = useMemo(() => {
        return `组件设置 - ${sourceWidget.label}`;
    }, [sourceWidget.label]);

    const requestClose = () => {
        if (!isDirty) {
            closeWithoutSave();
            return;
        }

        setCloseConfirmOpen(true);
    };

    if (!schema) {
        return (
            <div className='flex items-center justify-center w-full h-full text-gray-400'>
                无法加载设置面板
            </div>
        );
    }
    return (
        <>
            <Modal
                getContainer={() => container || document.body}
                panelRef={setPanelHostElement}
                open
                width={760}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                }}
                styles={{
                    wrapper: {
                        overflow: 'hidden',
                    },
                    body: {
                        flex: 1,
                        minHeight: 0,
                        overflow: 'hidden',
                        padding: 0,
                    },
                }}
                mask={{
                    closable: false,
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
                            {widgetTitle}
                        </Typography.Text>
                        <div className='flex items-center gap-1'>
                            <Button
                                type='text'
                                size='small'
                                title={maximized ? '还原' : '最大化'}
                                onClick={() => {
                                    if (!panelHostElement) {
                                        return;
                                    }
                                    const nextMaximized = toggleMaximizeTarget(panelHostElement, container);
                                    setMaximized(nextMaximized);
                                }}
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
                <div className='flex min-h-0 h-full w-full flex-col overflow-hidden p-1'>
                    <WidgetDynamicForm
                        value={draftValues}
                        schema={schema}
                        onChange={(nextDraft, changedKey) => {
                            commitDraft(nextDraft);
                            if (!DEFERRED_MODEL_KEYS.has(changedKey)) {
                                applyLivePatch(nextDraft);
                            }
                        }}
                    />
                </div>
            </Modal>

            <Moveable
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
                container={container || document.body}
                renderDirections={[]}
                ables={[Maximizable]}
                props={{
                    maximizable: true,
                    maximizableThreshold: 2,
                    onMaximizeChange: (nextMaximized: boolean) => {
                        setMaximized(nextMaximized);
                    },
                }}
                snappable
                snapDirections={{ left: true, top: true, right: true, bottom: true, center: true, middle: true }}
                bounds={{ position: 'css', left: 0, top: 0, right: 0, bottom: 0 }}
                onDrag={({ target, transform }) => {
                    target.style.transform = transform;
                }}
                onResize={({ target, width, height, drag }) => {
                    target.style.width = `${width}px`;
                    target.style.height = `${height}px`;
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