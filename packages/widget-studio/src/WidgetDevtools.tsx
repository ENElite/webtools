'use client';

import { Button, Card, Drawer, SegmentedControl, Toolbar } from '@webtools/ui';
import { useCallback, useMemo, useState } from 'react';
import { useWidgetRuntime, useWidgetSnapshot } from '@webtools/widget-react';

type DevtoolsTab = 'document' | 'history';

export function WidgetDevtools() {
    const runtime = useWidgetRuntime();
    const snapshot = useWidgetSnapshot();
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<DevtoolsTab>('document');
    const [copied, setCopied] = useState(false);
    const body = useMemo(() => tab === 'document'
        ? snapshot.document
        : { canUndo: snapshot.canUndo, canRedo: snapshot.canRedo }, [snapshot, tab]);
    const json = useMemo(() => JSON.stringify(body, null, 2), [body]);
    const copyJson = useCallback(async () => {
        await navigator.clipboard.writeText(json);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    }, [json]);

    return (
        <>
            <Button className='wt-studio-devtools-trigger' size='sm' onClick={() => setOpen(true)}>Devtools</Button>
            <Drawer
                open={open}
                onOpenChange={setOpen}
                title='Widget Devtools'
                placement='right'
                size='lg'
                className='wt-studio-devtools-drawer'
            >
                <div className='wt-studio-devtools'>
                    <SegmentedControl<DevtoolsTab>
                        value={tab}
                        options={[{ label: 'Document', value: 'document' }, { label: 'History', value: 'history' }]}
                        onValueChange={setTab}
                        aria-label='Devtools 数据视图'
                    />
                    <Toolbar aria-label='历史记录操作'>
                        <Button size='sm' disabled={!snapshot.canUndo} onClick={() => runtime.engine.undo()}>Undo</Button>
                        <Button size='sm' disabled={!snapshot.canRedo} onClick={() => runtime.engine.redo()}>Redo</Button>
                        <Button size='sm' variant='ghost' onClick={() => void copyJson()}>{copied ? '已复制' : '复制 JSON'}</Button>
                    </Toolbar>
                    <Card className='wt-studio-json-card'>
                        <pre className='wt-studio-json'>{json}</pre>
                    </Card>
                </div>
            </Drawer>
        </>
    );
}
