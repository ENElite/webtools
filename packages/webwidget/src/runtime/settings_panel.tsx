import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { Button, Modal, Typography } from 'antd';
import Moveable from 'react-moveable';

import { PropertyInspector } from '../engine/editor';
import type { InspectorSchema, PageRegistry, Patch } from '../engine/editor';
import { applyChange, diffObjects } from '../engine/editor/applyChange';
import { useMaximize } from './useMaximize';
import type { WidgetModel } from '../engine/model';

type SettingsPanelProps = {
    panelKey: string | number;
    title: string;
    sourceWidget: WidgetModel;
    schema: InspectorSchema;
    pages: PageRegistry;
    container: HTMLElement;
    onChange: (patch: Patch) => void;
    onClose: () => void;
    onSave?: (patch: Patch) => void;
    emptyState?: ReactNode;
};

type HistoryEntry = {
    prev: WidgetModel;
    next: WidgetModel;
};

function cloneWidget(widget: WidgetModel): WidgetModel {
    return structuredClone(widget);
}

function widgetsEqual(a: WidgetModel, b: WidgetModel): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

export function SettingsFormPanel({
    panelKey,
    title,
    sourceWidget,
    schema,
    pages,
    container,
    onChange,
    onClose,
    onSave,
    emptyState,
}: SettingsPanelProps) {
    const [panelHostElement, setPanelHostElement] = useState<HTMLDivElement | null>(null);
    const [headerElement, setHeaderElement] = useState<HTMLElement | null>(null);
    const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
    const moveableRef = useRef<Moveable | null>(null);

    const [draftWidget, setDraftWidget] = useState<WidgetModel>(() => cloneWidget(sourceWidget));
    const [savedWidget, setSavedWidget] = useState<WidgetModel>(() => cloneWidget(sourceWidget));
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [future, setFuture] = useState<HistoryEntry[]>([]);
    const initialValuesRef = useRef<WidgetModel>(cloneWidget(sourceWidget));

    const resetPanelState = (nextWidget: WidgetModel) => {
        const cloned = cloneWidget(nextWidget);
        initialValuesRef.current = cloneWidget(cloned);
        setDraftWidget(cloned);
        setSavedWidget(cloneWidget(cloned));
        setHistory([]);
        setFuture([]);
        setCloseConfirmOpen(false);
    };

    useEffect(() => {
        resetPanelState(sourceWidget);
    }, [panelKey]);

    const commitPatch = (patch: Patch) => {
        const nextWidget = cloneWidget(applyChange(draftWidget, patch));
        if (widgetsEqual(draftWidget, nextWidget)) {
            return;
        }

        setHistory((prev) => [...prev, { prev: cloneWidget(draftWidget), next: nextWidget }]);
        setFuture([]);
        setDraftWidget(nextWidget);
        onChange(patch);
    };

    const undo = () => {
        if (history.length === 0) return;
        const entry = history[history.length - 1]!;
        const inversePatch = diffObjects(entry.next, entry.prev);
        setHistory((prev) => prev.slice(0, -1));
        setFuture((prev) => [{ prev: entry.prev, next: entry.next }, ...prev]);
        setDraftWidget(entry.prev);
        if (inversePatch) {
            onChange({ set: inversePatch });
        }
    };

    const redo = () => {
        if (future.length === 0) return;
        const entry = future[0]!;
        const patch = diffObjects(entry.prev, entry.next);
        setFuture((prev) => prev.slice(1));
        setHistory((prev) => [...prev, { prev: entry.prev, next: entry.next }]);
        setDraftWidget(entry.next);
        if (patch) {
            onChange({ set: patch });
        }
    };

    const resetToInitial = () => {
        const initialValues = initialValuesRef.current;
        if (widgetsEqual(draftWidget, initialValues)) {
            return;
        }

        const patch = diffObjects(draftWidget, initialValues);
        setHistory((prev) => [...prev, { prev: cloneWidget(draftWidget), next: initialValues }]);
        setFuture([]);
        setDraftWidget(initialValues);
        if (patch) {
            onChange({ set: patch });
        }
    };

    const save = () => {
        const patch = diffObjects(savedWidget, draftWidget);
        setSavedWidget(cloneWidget(draftWidget));
        if (patch) {
            onSave?.({ set: patch });
        }
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

    const isDirty = useMemo(() => !widgetsEqual(draftWidget, savedWidget), [draftWidget, savedWidget]);
    const canUndo = history.length > 0;
    const canRedo = future.length > 0;

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
                        <PropertyInspector
                            value={draftWidget}
                            schema={schema}
                            pages={pages}
                            onChange={commitPatch}
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
