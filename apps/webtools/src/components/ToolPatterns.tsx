'use client';

import { Collapsible, EmptyState, Progress, Spinner } from '@webtools/ui';

export function CollapsibleSection({
    title,
    children,
    defaultOpen = false,
}: {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    return (
        <Collapsible title={title} defaultOpen={defaultOpen}>
            <div className='space-y-3 text-sm leading-7 text-[var(--wt-color-text-muted)]'>
                {children}
            </div>
        </Collapsible>
    );
}

export function ProcessProgress({
    progress,
    label = '处理中…',
}: {
    progress?: number;
    label?: string;
}) {
    const hasProgress = typeof progress === 'number' && Number.isFinite(progress) && progress > 0;

    return (
        <div className='flex min-w-56 flex-col items-center gap-3 rounded-[var(--wt-radius-lg)] bg-[var(--wt-color-surface)] p-5 text-center shadow-[var(--wt-shadow-lg)]'>
            <Spinner size='lg' label={label} />
            {hasProgress && (
                <div className='w-full'>
                    <Progress value={Math.min(100, progress * 100)} label={label} showValue />
                </div>
            )}
        </div>
    );
}

export function ResultPlaceholder({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description?: string;
}) {
    return (
        <EmptyState
            icon={icon}
            title={title}
            description={description}
            className='min-h-52 border-2 border-dashed border-[var(--wt-color-border)] bg-[var(--wt-color-surface-tinted)]'
        />
    );
}
