import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useOverlayStore as useOverlayRootStore } from '../store';
import { splitSettingsValues } from './settings_utils';
import { parseTransformString } from '../transform_utils';
import type { WidgetModel, WidgetPropPrimitive } from '../types';

export type WidgetSettingsDraft = Record<string, WidgetPropPrimitive>;

function buildDraft(widget: WidgetModel): WidgetSettingsDraft {
    const { x, y, rotation } = parseTransformString(widget.style.transform);
    const width = Number.parseFloat(widget.style.width) || 0;
    const height = Number.parseFloat(widget.style.height) || 0;
    const borderRadius = Number.parseFloat(widget.style.borderRadius) || 0;

    return {
        id: widget.id,
        locked: widget.locked ?? false,
        autoHide: widget.autoHide ?? false,
        ...widget.props,
        width,
        height,
        x,
        y,
        rotation,
        borderRadius,
        backgroundColor: widget.style.backgroundColor ?? 'rgba(255, 255, 255, 0)',
        backgroundEffect: widget.style.backgroundEffect ?? 'none',
        backgroundImageUrl: widget.style.backgroundImageUrl ?? '',
        borderColor: widget.style.borderColor ?? '#38bdf8',
        borderWidth: widget.style.borderWidth ?? 0,
        borderStyle: widget.style.borderStyle ?? 'solid',
        shadowRadius: widget.style.shadowRadius ?? 0,
        shadowColor: widget.style.shadowColor ?? 'rgba(0, 0, 0, 0.5)',
    };
}

function cloneDraft(draft: WidgetSettingsDraft): WidgetSettingsDraft {
    return { ...draft };
}

function draftEquals(a: WidgetSettingsDraft, b: WidgetSettingsDraft): boolean {
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

export function buildWidgetSettingsDraft(widget: WidgetModel): WidgetSettingsDraft {
    return buildDraft(widget);
}

export function useWidgetStore(widget: WidgetModel, onClose: () => void) {
    const updateWidget = useOverlayRootStore((state) => state.updateOverlayWidget);
    const initialDraftRef = useRef<WidgetSettingsDraft>(buildDraft(widget));

    const [draftValues, setDraftValues] = useState<WidgetSettingsDraft>(() => buildDraft(widget));
    const [savedDraft, setSavedDraft] = useState<WidgetSettingsDraft>(() => buildDraft(widget));
    const [historyState, setHistoryState] = useState<{ past: WidgetSettingsDraft[]; future: WidgetSettingsDraft[] }>({
        past: [],
        future: [],
    });

    useEffect(() => {
        const nextDraft = buildDraft(widget);
        initialDraftRef.current = cloneDraft(nextDraft);
        setDraftValues(cloneDraft(nextDraft));
        setSavedDraft(cloneDraft(nextDraft));
        setHistoryState({ past: [], future: [] });
    }, [widget.id]);

    const canUndo = historyState.past.length > 0;
    const canRedo = historyState.future.length > 0;
    const isDirty = useMemo(() => !draftEquals(draftValues, savedDraft), [draftValues, savedDraft]);

    const commitDraft = useCallback((nextDraft: WidgetSettingsDraft) => {
        if (draftEquals(draftValues, nextDraft)) {
            return;
        }

        setHistoryState((current) => ({
            past: [...current.past, cloneDraft(draftValues)],
            future: [],
        }));
        setDraftValues(cloneDraft(nextDraft));
    }, [draftValues]);

    const undo = useCallback(() => {
        setHistoryState((current) => {
            const previous = current.past[current.past.length - 1];
            if (!previous) {
                return current;
            }

            setDraftValues(cloneDraft(previous));
            return {
                past: current.past.slice(0, -1),
                future: [cloneDraft(draftValues), ...current.future],
            };
        });
    }, [draftValues]);

    const redo = useCallback(() => {
        setHistoryState((current) => {
            const next = current.future[0];
            if (!next) {
                return current;
            }

            setDraftValues(cloneDraft(next));
            return {
                past: [...current.past, cloneDraft(draftValues)],
                future: current.future.slice(1),
            };
        });
    }, [draftValues]);

    const resetToInitial = useCallback(() => {
        const initialDraft = initialDraftRef.current;
        if (draftEquals(draftValues, initialDraft)) {
            return;
        }

        setHistoryState((current) => ({
            past: [...current.past, cloneDraft(draftValues)],
            future: [],
        }));
        setDraftValues(cloneDraft(initialDraft));
    }, [draftValues]);

    const save = useCallback(() => {
        const nextPatch = splitSettingsValues(draftValues, widget);
        updateWidget(widget.id, nextPatch);
        setSavedDraft(cloneDraft(draftValues));
    }, [draftValues, updateWidget, widget]);

    const applyLivePatch = useCallback((nextDraft: WidgetSettingsDraft) => {
        const nextPatch = splitSettingsValues(nextDraft, widget);
        updateWidget(widget.id, {
            props: nextPatch.props,
            style: nextPatch.style,
        });
    }, [updateWidget, widget]);

    const saveAndClose = useCallback(() => {
        const nextPatch = splitSettingsValues(draftValues, widget);
        updateWidget(widget.id, nextPatch);
        setSavedDraft(cloneDraft(draftValues));
        onClose();
    }, [draftValues, onClose, updateWidget, widget]);

    const discardAndClose = useCallback(() => {
        onClose();
    }, [onClose]);

    const closeWithoutSave = useCallback(() => {
        onClose();
    }, [onClose]);

    return {
        draftValues,
        canUndo,
        canRedo,
        isDirty,
        commitDraft,
        undo,
        redo,
        resetToInitial,
        applyLivePatch,
        save,
        saveAndClose,
        discardAndClose,
        closeWithoutSave,
    };
}