import { Button, Modal } from 'antd';

import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';

import { DEFAULT_OVERLAY_Z_INDEX } from './constants';
import { OverlayMoveable } from './moveable';
import { overlayReducer } from './reducer';
import { resolveWidgetRenderer } from './registry';
import { resolveWidgetSettingsSchema } from './settings/registry';
import { WidgetDynamicForm } from './settings/widget_dynamic_form';
import { buildTransformString, parseTransformString } from './transform_utils';
import type {
    WidgetPropPrimitive,
    OverlayState,
    WidgetModel,
    WidgetableActionEvent,
    WidgetRendererMap,
} from './types';
import { Widget } from './widget';

type WidgetSettingsDraft = Record<string, WidgetPropPrimitive>;

type OverlayRootProps = {
    initialWidgets: WidgetModel[];
    renderers: WidgetRendererMap;
};

export function OverlayRoot({ initialWidgets, renderers }: OverlayRootProps) {
    const [state, dispatch] = useReducer(overlayReducer, {
        widgets: initialWidgets,
        activeWidgetId: null, // 初始时不选中任何组件
        bounds: null,
    } satisfies OverlayState);
    const [settingsWidgetId, setSettingsWidgetId] = useState<string | null>(null);
    const [settingsDraftValues, setSettingsDraftValues] = useState<WidgetSettingsDraft | null>(null);
    const [settingsInitialValues, setSettingsInitialValues] = useState<WidgetSettingsDraft | null>(null);
    const [unsavedConfirmOpen, setUnsavedConfirmOpen] = useState(false);

    const overlayRef = useRef<HTMLDivElement | null>(null);
    const widgetElementRef = useRef<Record<string, HTMLDivElement | null>>({});

    useEffect(() => {
        dispatch({ type: 'set-widgets', widgets: initialWidgets });
    }, [initialWidgets]);

    useLayoutEffect(() => {
        const element = overlayRef.current;
        if (!element) {
            return;
        }

        const updateBounds = () => {
            const rect = element.getBoundingClientRect();
            dispatch({
                type: 'set-bounds',
                bounds: {
                    width: rect.width,
                    height: rect.height,
                },
            });
        };

        updateBounds();

        const observer = new ResizeObserver(() => {
            updateBounds();
        });

        observer.observe(element);
        return () => {
            observer.disconnect();
        };
    }, []);

    const activeWidget = useMemo(() => {
        if (!state.activeWidgetId) {
            return null;
        }

        return state.widgets.find((widget) => widget.id === state.activeWidgetId) || null;
    }, [state.activeWidgetId, state.widgets]);

    const settingsWidget = useMemo(() => {
        if (!settingsWidgetId) {
            return null;
        }

        return state.widgets.find((widget) => widget.id === settingsWidgetId) || null;
    }, [settingsWidgetId, state.widgets]);

    const settingsSchema = useMemo(() => {
        if (!settingsWidget) {
            return null;
        }

        return resolveWidgetSettingsSchema(settingsWidget.kind);
    }, [settingsWidget]);

    const readDraftNumber = (draft: WidgetSettingsDraft, key: string, fallback: number) => {
        const nextValue = draft[key];
        return typeof nextValue === 'number' ? nextValue : fallback;
    };

    const buildSettingsDraft = (widget: WidgetModel): WidgetSettingsDraft => {
        const { x, y, rotation } = parseTransformString(widget.style.transform);
        const width = Number.parseFloat(widget.style.width) || 0;
        const height = Number.parseFloat(widget.style.height) || 0;

        return {
            ...widget.props,
            width,
            height,
            x,
            y,
            rotation,
        };
    };

    const buildWidgetStyleFromDraft = (draft: WidgetSettingsDraft, fallbackStyle: WidgetModel['style']): WidgetModel['style'] => {
        const fallbackTransform = parseTransformString(fallbackStyle.transform);
        const width = readDraftNumber(draft, 'width', Number.parseFloat(fallbackStyle.width) || 0);
        const height = readDraftNumber(draft, 'height', Number.parseFloat(fallbackStyle.height) || 0);
        const x = readDraftNumber(draft, 'x', fallbackTransform.x);
        const y = readDraftNumber(draft, 'y', fallbackTransform.y);
        const rotation = readDraftNumber(draft, 'rotation', fallbackTransform.rotation);

        return {
            width: `${width}px`,
            height: `${height}px`,
            transform: buildTransformString(x, y, rotation),
        };
    };

    const splitSettingsValues = (draft: WidgetSettingsDraft, widget: WidgetModel) => {
        const { width, height, x, y, rotation, ...props } = draft;
        return {
            props,
            style: buildWidgetStyleFromDraft({ width, height, x, y, rotation } as WidgetSettingsDraft, widget.style),
        };
    };

    const closeWidgetSettings = () => {
        setUnsavedConfirmOpen(false);
        setSettingsWidgetId(null);
        setSettingsDraftValues(null);
        setSettingsInitialValues(null);
    };

    const isSettingsDirty = useMemo(() => {
        if (!settingsDraftValues || !settingsInitialValues) {
            return false;
        }

        const keys = new Set([
            ...Object.keys(settingsDraftValues),
            ...Object.keys(settingsInitialValues),
        ]);

        for (const key of keys) {
            if (settingsDraftValues[key] !== settingsInitialValues[key]) {
                return true;
            }
        }

        return false;
    }, [settingsDraftValues, settingsInitialValues]);

    const requestCloseWidgetSettings = () => {
        if (isSettingsDirty) {
            setUnsavedConfirmOpen(true);
            return;
        }

        closeWidgetSettings();
    };

    const saveWidgetSettings = () => {
        if (!settingsWidgetId || !settingsDraftValues || !settingsWidget) {
            return;
        }

        const { props, style } = splitSettingsValues(settingsDraftValues, settingsWidget);

        dispatch({
            type: 'update-widget',
            widgetId: settingsWidgetId,
            patch: {
                props,
                style,
            },
        });
        closeWidgetSettings();
    };

    const activateWidget = (widgetId: string) => {
        dispatch({ type: 'set-active', widgetId });
    };

    const handleWidgetTransformChange = (widgetId: string, style: WidgetModel['style']) => {
        dispatch({
            type: 'update-widget',
            widgetId,
            patch: { style: style },
        });
    };

    const handleWidgetableAction = (event: WidgetableActionEvent) => {
        switch (event.type) {
            case 'move-widget-up':
            case 'move-widget-down':
            case 'move-widget-to-top':
            case 'move-widget-to-bottom':
            case 'remove-widget': {
                dispatch(event);
                return;
            }

            case 'toggle-widget-lock': {
                console.log('Toggle lock for widget:', event.widgetId, 'Locked:', event.locked);
                dispatch({
                    type: 'update-widget',
                    widgetId: event.widgetId,
                    patch: { locked: event.locked },
                });
                return;
            }

            case 'reset-widget-rotation': {
                const { x, y } = parseTransformString(event.style.transform);
                dispatch({
                    type: 'update-widget',
                    widgetId: event.widgetId,
                    patch: {
                        style: {
                            ...event.style,
                            transform: buildTransformString(x, y, 0),
                        },
                    },
                });
                return;
            }

            case 'copy-widget': {
                dispatch({
                    type: 'copy-widget',
                    widgetId: event.widgetId,
                    transform: event.style,
                });
                return;
            }

            case 'open-widget-settings': {
                const widget = state.widgets.find((item) => item.id === event.widgetId);
                if (!widget) {
                    return;
                }

                const schema = resolveWidgetSettingsSchema(widget.kind);
                if (!schema) {
                    return;
                }

                setSettingsWidgetId(widget.id);
                setSettingsDraftValues(buildSettingsDraft(widget));
                setSettingsInitialValues(buildSettingsDraft(widget));
                setUnsavedConfirmOpen(false);
                return;
            }

            default:
                return;
        }
    };

    return (
        <div
            ref={overlayRef}
            className='absolute inset-0 select-none'
            style={{ zIndex: DEFAULT_OVERLAY_Z_INDEX }}
            onMouseDown={(event) => {
                if (event.target !== event.currentTarget) {
                    return;
                }
                dispatch({ type: 'set-active', widgetId: null });
            }}
        >
            {state.widgets.map((widget) => {
                const renderer = resolveWidgetRenderer(renderers, widget.kind);
                if (!renderer) {
                    return null;
                }

                const WidgetRenderer = renderer;

                return (
                    <Widget
                        key={widget.id}
                        widget={widget}
                        active={widget.id === state.activeWidgetId}
                        rootRef={(element) => {
                            widgetElementRef.current[widget.id] = element;
                        }}
                        onClick={() => activateWidget(widget.id)}
                    >
                        <WidgetRenderer widget={widget} active={widget.id === state.activeWidgetId} />
                    </Widget>
                );
            })}

            <OverlayMoveable
                activeWidget={activeWidget}
                overlayRef={overlayRef}
                widgetElementRef={widgetElementRef}
                widgets={state.widgets}
                onWidgetableAction={handleWidgetableAction}
                onWidgetTransformChange={handleWidgetTransformChange}
            />

            <Modal
                title='组件设置'
                centered
                open={Boolean(settingsWidget && settingsSchema && settingsDraftValues)}
                onCancel={requestCloseWidgetSettings}
                onOk={saveWidgetSettings}
                okText='保存'
                cancelText='取消'
                destroyOnHidden
                mask={{ blur: true }}
            >
                {settingsSchema && settingsDraftValues
                    ? (
                        <WidgetDynamicForm
                            value={settingsDraftValues}
                            schema={settingsSchema}
                            onChange={setSettingsDraftValues}
                        />
                    )
                    : null}
            </Modal>

            <Modal
                title='设置项未保存'
                centered
                open={unsavedConfirmOpen}
                onCancel={() => setUnsavedConfirmOpen(false)}
                footer={[
                    <Button key='continue-edit' onClick={() => setUnsavedConfirmOpen(false)}>
                        继续编辑
                    </Button>,
                    <Button key='discard' onClick={closeWidgetSettings}>
                        不保存并返回
                    </Button>,
                    <Button
                        key='save'
                        type='primary'
                        onClick={() => {
                            saveWidgetSettings();
                            setUnsavedConfirmOpen(false);
                        }}
                    >
                        保存并返回
                    </Button>,
                ]}
                mask={{ closable: false }}
                destroyOnHidden
            >
                当前设置项尚未保存，是否保存后返回？
            </Modal>
        </div>
    );
}

export const Overlay = OverlayRoot;
