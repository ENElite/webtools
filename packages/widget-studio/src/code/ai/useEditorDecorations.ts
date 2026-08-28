import { useEffect, useRef, useCallback } from 'react';
import type { editor as MonacoEditor } from 'monaco-editor';
import type { AIEditChange } from './types';

type EditorInstance = MonacoEditor.IStandaloneCodeEditor;

type DecorationEntry = {
    change: AIEditChange;
    decorationCollection: MonacoEditor.IEditorDecorationsCollection;
    widget: MonacoEditor.IContentWidget;
};

export type UseEditorDecorationsReturn = {
    applyChange: (editor: EditorInstance, change: AIEditChange) => void;
    acceptChange: (editor: EditorInstance, changeId: string) => string | null;
    rejectChange: (editor: EditorInstance, changeId: string) => void;
    clearAll: (editor: EditorInstance) => void;
};

let widgetIdCounter = 0;

function createAcceptRejectWidget(
    change: AIEditChange,
    onAccept: () => void,
    onReject: () => void,
): MonacoEditor.IContentWidget {
    const id = `ai-widget-${++widgetIdCounter}`;

    const domNode = document.createElement('div');
    domNode.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 2px 6px;
        background: rgba(30, 30, 40, 0.92);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 11px;
        z-index: 10;
        cursor: default;
    `;

    const acceptBtn = document.createElement('button');
    acceptBtn.textContent = '✓ Accept';
    acceptBtn.style.cssText = `
        padding: 2px 8px;
        border: none;
        border-radius: 3px;
        background: #22c55e;
        color: #fff;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        white-space: nowrap;
    `;
    acceptBtn.onmouseenter = () => { acceptBtn.style.background = '#16a34a'; };
    acceptBtn.onmouseleave = () => { acceptBtn.style.background = '#22c55e'; };
    acceptBtn.onclick = (e) => { e.stopPropagation(); onAccept(); };

    const rejectBtn = document.createElement('button');
    rejectBtn.textContent = '✗ Reject';
    rejectBtn.style.cssText = `
        padding: 2px 8px;
        border: none;
        border-radius: 3px;
        background: #ef4444;
        color: #fff;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        white-space: nowrap;
    `;
    rejectBtn.onmouseenter = () => { rejectBtn.style.background = '#dc2626'; };
    rejectBtn.onmouseleave = () => { rejectBtn.style.background = '#ef4444'; };
    rejectBtn.onclick = (e) => { e.stopPropagation(); onReject(); };

    const label = document.createElement('span');
    label.style.cssText = 'color: #94a3b8; margin-right: 4px; white-space: nowrap;';
    label.textContent = change.summary ?? 'AI change';

    domNode.appendChild(label);
    domNode.appendChild(acceptBtn);
    domNode.appendChild(rejectBtn);

    return {
        getId: () => id,
        getDomNode: () => domNode,
        getPosition: () => ({
            position: {
                lineNumber: change.range.startLine,
                column: change.range.startColumn,
            },
            preference: [0], // ABOVE
        }),
    };
}

export function useEditorDecorations(): UseEditorDecorationsReturn {
    const entriesRef = useRef<Map<string, DecorationEntry>>(new Map());

    const applyChange = useCallback((editor: EditorInstance, change: AIEditChange) => {
        // Remove existing decoration for this change id
        const existing = entriesRef.current.get(change.id);
        if (existing) {
            existing.decorationCollection.clear();
            editor.removeContentWidget(existing.widget);
            entriesRef.current.delete(change.id);
        }

        const range = {
            startLineNumber: change.range.startLine,
            startColumn: change.range.startColumn,
            endLineNumber: change.range.endLine,
            endColumn: change.range.endColumn,
        };

        const decorationCollection = editor.createDecorationsCollection([
            {
                range,
                options: {
                    isWholeLine: true,
                    className: 'ai-change-highlight',
                    overviewRuler: {
                        color: '#4ade80',
                        position: 1, // OverviewRulerLane.Left
                    },
                    minimap: { color: '#4ade80', position: 1 },
                },
            },
        ]);

        const onAccept = () => {
            // Accept is handled externally via useAIEditor
            const event = new CustomEvent('ai-change-accept', { detail: { changeId: change.id } });
            editor.getDomNode()?.dispatchEvent(event);
        };

        const onReject = () => {
            const event = new CustomEvent('ai-change-reject', { detail: { changeId: change.id } });
            editor.getDomNode()?.dispatchEvent(event);
        };

        const widget = createAcceptRejectWidget(change, onAccept, onReject);
        editor.addContentWidget(widget);

        entriesRef.current.set(change.id, { change, decorationCollection, widget });

        // Scroll to the change
        editor.revealRangeInCenter(range);
    }, []);

    const acceptChange = useCallback((editor: EditorInstance, changeId: string): string | null => {
        const entry = entriesRef.current.get(changeId);
        if (!entry) return null;

        // Apply the new text to the editor model
        const model = editor.getModel();
        if (model) {
            const range = {
                startLineNumber: entry.change.range.startLine,
                startColumn: entry.change.range.startColumn,
                endLineNumber: entry.change.range.endLine,
                endColumn: entry.change.range.endColumn,
            };
            model.pushEditOperations(
                [],
                [{ range, text: entry.change.newText }],
                () => null,
            );
        }

        // Clean up decorations and widget
        entry.decorationCollection.clear();
        editor.removeContentWidget(entry.widget);
        entriesRef.current.delete(changeId);

        return entry.change.newText;
    }, []);

    const rejectChange = useCallback((editor: EditorInstance, changeId: string) => {
        const entry = entriesRef.current.get(changeId);
        if (!entry) return;

        entry.decorationCollection.clear();
        editor.removeContentWidget(entry.widget);
        entriesRef.current.delete(changeId);
    }, []);

    const clearAll = useCallback((editor: EditorInstance) => {
        for (const [, entry] of entriesRef.current) {
            entry.decorationCollection.clear();
            editor.removeContentWidget(entry.widget);
        }
        entriesRef.current.clear();
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            entriesRef.current.clear();
        };
    }, []);

    return { applyChange, acceptChange, rejectChange, clearAll };
}
