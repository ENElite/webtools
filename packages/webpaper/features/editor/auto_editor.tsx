import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { ForwardedRef } from 'react';
import { DiffEditor, Editor } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';

import type { EditorSaveHandler } from './types';

type MonacoRuntime = typeof import('monaco-editor');

export type AutoEditorMode = 'editor' | 'diff';

export type AutoEditorHandle = {
    getContent: () => string;
    writeContent: (content: string) => void;
    save: () => void;
};

export type AutoEditorProps = {
    initialValue?: string;
    value?: string;
    language?: string;
    theme?: string;
    height?: string | number;
    className?: string;
    saveButtonText?: string;
    showSaveButton?: boolean;
    onContentChange?: (content: string) => void;
    onSave?: EditorSaveHandler;
    onModeChange?: (mode: AutoEditorMode) => void;
    onCommit?: (content: string) => void;
    onRevert?: () => void;
};

function AutoEditorImpl(
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
        onModeChange,
        onCommit,
        onRevert,
    }: AutoEditorProps,
    ref: ForwardedRef<AutoEditorHandle>
) {
    const [mode, setMode] = useState<AutoEditorMode>('editor');
    const [content, setContent] = useState(value ?? initialValue);
    const [pendingContent, setPendingContent] = useState<string | null>(null);
    const [baseContent, setBaseContent] = useState<string | null>(null);
    const contentRef = useRef(content);
    const pendingRef = useRef(pendingContent);
    const baseRef = useRef(baseContent);
    const monacoRef = useRef<MonacoRuntime | null>(null);

    contentRef.current = content;
    pendingRef.current = pendingContent;
    baseRef.current = baseContent;

    const isDiffMode = mode === 'diff' && pendingContent !== null && baseContent !== null;

    const commitCurrent = () => {
        void onSave?.(pendingRef.current ?? contentRef.current);
    };


    const emitModeChange = (nextMode: AutoEditorMode) => {
        setMode(nextMode);
        onModeChange?.(nextMode);
    };

    const commitPending = () => {
        const nextContent = pendingRef.current;
        if (nextContent === null) {
            emitModeChange('editor');
            return;
        }

        setContent(nextContent);
        setBaseContent(null);
        setPendingContent(null);
        emitModeChange('editor');
        onContentChange?.(nextContent);
        onCommit?.(nextContent);
    };

    const revertPending = () => {
        const nextBase = baseRef.current;
        setPendingContent(null);
        setBaseContent(null);
        if (nextBase !== null) {
            setContent(nextBase);
            onContentChange?.(nextBase);
        }
        emitModeChange('editor');
        onRevert?.();
    };

    useImperativeHandle(ref, () => ({
        getContent: () => pendingRef.current ?? contentRef.current,
        writeContent: (nextContent: string) => {
            if (baseRef.current === null) {
                setBaseContent(contentRef.current);
            }

            setPendingContent(nextContent);
            emitModeChange('diff');
        },
        save: () => {
            commitCurrent();
        },
    }), []);

    useEffect(() => {
        if (typeof value === 'undefined') {
            return;
        }

        setContent(value);
        contentRef.current = value;
    }, [isDiffMode, value]);

    useEffect(() => {
        if (typeof value !== 'undefined') {
            return;
        }

        setContent(initialValue);
        contentRef.current = initialValue;
    }, [initialValue, isDiffMode, value]);

    useEffect(() => {
        const monaco = monacoRef.current;
        if (!monaco) {
            return;
        }
    }, [language]);

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

    const diffOptions = useMemo<MonacoEditor.IDiffEditorConstructionOptions>(() => ({
        automaticLayout: true,
        fontSize: 14,
        minimap: { enabled: false },
        renderSideBySide: true,
        readOnly: false,
        scrollBeyondLastLine: false,
        originalEditable: true,
        renderMarginRevertIcon: true,
    }), []);

    return (
        <div className={className} style={{ width: '100%', height, minHeight: 0 }}>
            {isDiffMode && baseContent !== null && pendingContent !== null
                ? (
                    <div style={{ width: '100%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid rgba(148, 163, 184, 0.3)' }}>
                            <span style={{ fontSize: 12, color: '#64748b' }}>Diff 模式</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button type='button' onClick={commitPending}>保留</button>
                                <button type='button' onClick={revertPending}>撤销</button>
                            </div>
                        </div>

                        <div style={{ flex: 1, minHeight: 0 }}>
                            <DiffEditor
                                language={language}
                                theme={theme}
                                original={baseContent ?? content}
                                modified={pendingContent ?? content}
                                options={diffOptions}
                                height='100%'
                                beforeMount={(monaco) => {
                                    monacoRef.current = monaco;
                                }}
                                onMount={(_, monaco) => {
                                    monacoRef.current = monaco;
                                }}
                            />
                        </div>
                    </div>
                )
                : (
                    <div style={{ width: '100%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        {showSaveButton
                            ? (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 10px', borderBottom: '1px solid rgba(148, 163, 184, 0.3)' }}>
                                    <button type='button' onClick={commitCurrent}>
                                        {saveButtonText}
                                    </button>
                                </div>
                            )
                            : null}

                        <div style={{ flex: 1, minHeight: 0 }}>
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
                                onMount={(_, monaco) => {
                                    monacoRef.current = monaco;

                                }}
                                onChange={(nextValue) => {
                                    const nextContent = nextValue ?? '';
                                    setContent(nextContent);
                                    contentRef.current = nextContent;
                                    onContentChange?.(nextContent);
                                }}
                            />
                        </div>
                    </div>
                )}
        </div>
    );
}

export const AutoEditor = forwardRef(AutoEditorImpl);