import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { ForwardedRef } from 'react';
import { Editor } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';

import { AIFloatingButton, AIChatDialog } from './ai';
import { useAIEditor } from './ai/useAIEditor';
import { useEditorDecorations } from './ai/useEditorDecorations';
import type { AIProvider, AIMode, EditorSelection } from './ai/types';

type MonacoRuntime = typeof import('monaco-editor');

export type CodeEditorSaveHandler = (content: string) => void | Promise<void>;

export type CodeEditorHandle = {
    getContent: () => string;
    writeContent: (content: string) => void;
    save: () => void;
    getSelection: () => EditorSelection;
    applyAIContent: (newContent: string, summary?: string) => void;
};

export type CodeEditorProps = {
    initialValue?: string;
    value?: string;
    language?: string;
    theme?: string;
    height?: string | number;
    className?: string;
    saveButtonText?: string;
    showSaveButton?: boolean;
    onContentChange?: (content: string) => void;
    onSave?: CodeEditorSaveHandler;
    // AI props
    aiProvider?: AIProvider;
    aiMode?: AIMode;
    onAIModeChange?: (mode: AIMode) => void;
};

function CodeEditorImpl(
    {
        initialValue = '',
        value,
        language = 'typescript',
        theme = 'vs-dark',
        height = '100%',
        className,
        saveButtonText = '保存',
        showSaveButton = true,
        onContentChange,
        onSave,
        aiProvider,
        aiMode: controlledAIMode,
        onAIModeChange,
    }: CodeEditorProps,
    ref: ForwardedRef<CodeEditorHandle>
) {
    const [content, setContent] = useState(value ?? initialValue);
    const contentRef = useRef(content);
    const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<MonacoRuntime | null>(null);

    contentRef.current = content;

    // AI state
    const [aiOpen, setAIOpen] = useState(false);
    const {
        messages,
        pendingChanges,
        mode: internalAIMode,
        requesting,
        selection,
        setMode: setInternalAIMode,
        setSelection,
        send,
        acceptChange,
        rejectChange,
        acceptAll,
        rejectAll,
        clearMessages,
    } = useAIEditor(aiProvider);

    const aiMode = controlledAIMode ?? internalAIMode;
    const handleAIModeChange = useCallback((mode: AIMode) => {
        setInternalAIMode(mode);
        onAIModeChange?.(mode);
    }, [setInternalAIMode, onAIModeChange]);

    const decorations = useEditorDecorations();

    const commitCurrent = useCallback(() => {
        onSave?.(contentRef.current);
    }, [onSave]);

    // Track selection changes
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const disposable = editor.onDidChangeCursorSelection(() => {
            const sel = editor.getSelection();
            if (!sel || sel.isEmpty()) {
                setSelection(null);
                return;
            }

            const model = editor.getModel();
            if (!model) return;

            const selectedText = model.getValueInRange(sel);
            if (!selectedText.trim()) {
                setSelection(null);
                return;
            }

            setSelection({
                text: selectedText,
                startLine: sel.startLineNumber,
                endLine: sel.endLineNumber,
                startColumn: sel.startColumn,
                endColumn: sel.endColumn,
            });
        });

        return () => disposable.dispose();
    }, [setSelection]);

    // Apply AI changes with decorations
    const handleApplyAIContent = useCallback((newContent: string, summary?: string) => {
        const editor = editorRef.current;
        if (!editor) return;

        const model = editor.getModel();
        if (!model) return;

        const fullRange = model.getFullModelRange();
        const oldText = model.getValueInRange(fullRange);

        const changeId = `ai-apply-${Date.now().toString(36)}`;
        const change = {
            id: changeId,
            range: {
                startLine: fullRange.startLineNumber,
                startColumn: fullRange.startColumn,
                endLine: fullRange.endLineNumber,
                endColumn: fullRange.endColumn,
            },
            oldText,
            newText: newContent,
            summary: summary ?? 'AI 编辑',
            status: 'pending' as const,
        };

        decorations.applyChange(editor, change);

        // Listen for accept/reject events from the content widget
        const domNode = editor.getDomNode();
        if (!domNode) return;

        const handleAccept = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.changeId === changeId) {
                const accepted = decorations.acceptChange(editor, changeId);
                if (accepted !== null) {
                    setContent(accepted);
                    contentRef.current = accepted;
                    onContentChange?.(accepted);
                }
            }
        };

        const handleReject = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.changeId === changeId) {
                decorations.rejectChange(editor, changeId);
            }
        };

        domNode.addEventListener('ai-change-accept', handleAccept as EventListener);
        domNode.addEventListener('ai-change-reject', handleReject as EventListener);

        return () => {
            domNode.removeEventListener('ai-change-accept', handleAccept as EventListener);
            domNode.removeEventListener('ai-change-reject', handleReject as EventListener);
        };
    }, [decorations, onContentChange]);

    // Handle AI mode changes — apply or reject pending changes based on mode
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        for (const change of pendingChanges) {
            if (change.status !== 'pending') continue;

            if (aiMode === 'auto') {
                // Auto-accept: apply directly
                const accepted = decorations.acceptChange(editor, change.id);
                if (accepted !== null) {
                    setContent(accepted);
                    contentRef.current = accepted;
                    onContentChange?.(accepted);
                }
                acceptChange(change.id);
            }
        }
    }, [pendingChanges, aiMode, decorations, acceptChange, onContentChange]);

    // Handle accept/reject from dialog
    const handleAcceptFromDialog = useCallback((changeId: string) => {
        const editor = editorRef.current;
        if (!editor) return;

        const accepted = decorations.acceptChange(editor, changeId);
        if (accepted !== null) {
            setContent(accepted);
            contentRef.current = accepted;
            onContentChange?.(accepted);
        }
        acceptChange(changeId);
    }, [decorations, acceptChange, onContentChange]);

    const handleRejectFromDialog = useCallback((changeId: string) => {
        const editor = editorRef.current;
        if (!editor) return;

        decorations.rejectChange(editor, changeId);
        rejectChange(changeId);
    }, [decorations, rejectChange]);

    const handleAcceptAll = useCallback(() => {
        const editor = editorRef.current;
        if (!editor) return;

        for (const change of pendingChanges) {
            if (change.status !== 'pending') continue;
            const accepted = decorations.acceptChange(editor, change.id);
            if (accepted !== null) {
                setContent(accepted);
                contentRef.current = accepted;
                onContentChange?.(accepted);
            }
        }
        acceptAll();
    }, [pendingChanges, decorations, acceptAll, onContentChange]);

    const handleRejectAll = useCallback(() => {
        const editor = editorRef.current;
        if (!editor) return;

        for (const change of pendingChanges) {
            if (change.status !== 'pending') continue;
            decorations.rejectChange(editor, change.id);
        }
        rejectAll();
    }, [pendingChanges, decorations, rejectAll]);

    // AI send handler
    const handleAISend = useCallback((content: string) => {
        const editor = editorRef.current;
        const docContent = editor?.getModel()?.getValue() ?? contentRef.current;
        send(content, docContent);
    }, [send]);

    // Imperative handle
    useImperativeHandle(ref, () => ({
        getContent: () => contentRef.current,
        writeContent: (nextContent: string) => {
            setContent(nextContent);
            contentRef.current = nextContent;
            onContentChange?.(nextContent);
        },
        save: () => {
            commitCurrent();
        },
        getSelection: () => selection,
        applyAIContent: handleApplyAIContent,
    }), [commitCurrent, onContentChange, selection, handleApplyAIContent]);

    // Sync external value
    useEffect(() => {
        if (typeof value === 'undefined') return;
        setContent(value);
        contentRef.current = value;
    }, [value]);

    useEffect(() => {
        if (typeof value !== 'undefined') return;
        setContent(initialValue);
        contentRef.current = initialValue;
    }, [initialValue, value]);

    const editorOptions = useMemo<MonacoEditor.IStandaloneEditorConstructionOptions>(() => ({
        automaticLayout: true,
        fontSize: 14,
        minimap: { enabled: false },
        wordWrap: 'on',
        tabSize: 2,
        insertSpaces: true,
        scrollBeyondLastLine: false,
        renderLineHighlight: 'all',
        formatOnPaste: true,
        formatOnType: true,
    }), []);

    const hasAI = !!aiProvider;

    return (
        <div className={className} style={{ width: '100%', height, minHeight: 0, position: 'relative' }}>
            {/* Save button bar */}
            {showSaveButton && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    padding: '4px 10px',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.3)',
                }}
                >
                    <button
                        type='button' onClick={commitCurrent} style={{
                            padding: '2px 12px',
                            fontSize: 12,
                            color: '#64748b',
                            background: 'none',
                            border: '1px solid rgba(148,163,184,0.3)',
                            borderRadius: 4,
                            cursor: 'pointer',
                        }}
                    >
                        {saveButtonText}
                    </button>
                </div>
            )}

            {/* Monaco Editor */}
            <div style={{ width: '100%', height: showSaveButton ? 'calc(100% - 33px)' : '100%', minHeight: 0 }}>
                <Editor
                    defaultLanguage={language}
                    theme={theme}
                    defaultValue={content}
                    options={editorOptions}
                    height='100%'
                    keepCurrentModel
                    beforeMount={(monaco) => {
                        monacoRef.current = monaco;
                    }}
                    onMount={(editor, monaco) => {
                        editorRef.current = editor;
                        monacoRef.current = monaco;

                        // Add CSS for AI decorations
                        monaco.editor.defineTheme('ai-theme', {
                            base: theme as any,
                            inherit: true,
                            rules: [],
                            colors: {
                                'ai-change-highlight.background': 'rgba(34, 197, 94, 0.12)',
                            },
                        });

                        // Inject highlight style
                        const styleEl = document.createElement('style');
                        styleEl.textContent = `
                            .ai-change-highlight {
                                background-color: rgba(34, 197, 94, 0.12) !important;
                            }
                        `;
                        document.head.appendChild(styleEl);
                    }}
                    onChange={(nextValue) => {
                        const nextContent = nextValue ?? '';
                        setContent(nextContent);
                        contentRef.current = nextContent;
                        onContentChange?.(nextContent);
                    }}
                />
            </div>

            {/* AI floating button */}
            {hasAI && (
                <AIFloatingButton
                    open={aiOpen}
                    onClick={() => setAIOpen((o) => !o)}
                />
            )}

            {/* AI chat dialog */}
            {hasAI && aiOpen && (
                <AIChatDialog
                    messages={messages}
                    pendingChanges={pendingChanges}
                    mode={aiMode}
                    requesting={requesting}
                    selection={selection}
                    onSend={handleAISend}
                    onModeChange={handleAIModeChange}
                    onAcceptChange={handleAcceptFromDialog}
                    onRejectChange={handleRejectFromDialog}
                    onAcceptAll={handleAcceptAll}
                    onRejectAll={handleRejectAll}
                    onClear={clearMessages}
                />
            )}
        </div>
    );
}

export const CodeEditor = forwardRef(CodeEditorImpl);
