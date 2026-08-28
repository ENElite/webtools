'use client';

import { Button, Drawer, Segmented, Space, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useWidgetRuntime, useWidgetSnapshot } from '@webtools/widget-react';

type DevtoolsTab = 'document' | 'history';

export function WidgetDevtools() {
    const runtime = useWidgetRuntime();
    const snapshot = useWidgetSnapshot();
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<DevtoolsTab>('document');
    const body = useMemo(() => tab === 'document'
        ? snapshot.document
        : { canUndo: snapshot.canUndo, canRedo: snapshot.canRedo }, [snapshot, tab]);

    return (
        <>
            <Button className='wt-studio-devtools-trigger' size='small' onClick={() => setOpen(true)}>Devtools</Button>
            <Drawer open={open} onClose={() => setOpen(false)} title='Widget Devtools' width={520}>
                <Space direction='vertical' className='wt-studio-full-control'>
                    <Segmented<DevtoolsTab>
                        value={tab}
                        options={[{ label: 'Document', value: 'document' }, { label: 'History', value: 'history' }]}
                        onChange={setTab}
                    />
                    <Space>
                        <Button disabled={!snapshot.canUndo} onClick={() => runtime.engine.undo()}>Undo</Button>
                        <Button disabled={!snapshot.canRedo} onClick={() => runtime.engine.redo()}>Redo</Button>
                    </Space>
                    <Typography.Text code copyable>
                        <pre className='wt-studio-json'>{JSON.stringify(body, null, 2)}</pre>
                    </Typography.Text>
                </Space>
            </Drawer>
        </>
    );
}
