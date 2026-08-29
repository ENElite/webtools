'use client';

import { Progress as ArkProgress, Toast as ArkToast, Toaster as ArkToaster, createToaster } from '@ark-ui/react';
import { forwardRef, useId } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

import type { ComponentSize, Tone } from './primitives';
import { cx } from './utils';

export interface ProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'defaultValue'> {
    value?: number | null;
    max?: number;
    label?: ReactNode;
    showValue?: boolean;
    tone?: 'accent' | 'success' | 'warning' | 'danger';
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(function Progress(
    { className, id, value, max = 100, label, showValue = false, tone = 'accent', ...props },
    ref,
) {
    const generatedId = useId();
    return (
        <ArkProgress.Root
            ref={ref}
            id={id ?? generatedId}
            className={cx('wt-progress', className)}
            value={value}
            max={max}
            data-tone={tone}
            {...props}
        >
            {label || showValue ? (
                <div className='wt-progress__header'>
                    {label ? <ArkProgress.Label>{label}</ArkProgress.Label> : <span />}
                    {showValue ? <ArkProgress.ValueText /> : null}
                </div>
            ) : null}
            <ArkProgress.Track className='wt-progress__track'>
                <ArkProgress.Range className='wt-progress__range' />
            </ArkProgress.Track>
        </ArkProgress.Root>
    );
});

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
    size?: ComponentSize;
    label?: string;
}

export const Spinner = forwardRef<HTMLSpanElement, SpinnerProps>(function Spinner(
    { className, size = 'md', label = '加载中', ...props },
    ref,
) {
    return (
        <span ref={ref} className={cx('wt-spinner', className)} data-size={size} role='status' {...props}>
            <span className='wt-spinner__shape' aria-hidden='true' />
            <span className='wt-visually-hidden'>{label}</span>
        </span>
    );
});

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
    title: ReactNode;
    description?: ReactNode;
    icon?: ReactNode;
    action?: ReactNode;
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
    { className, title, description, icon, action, ...props },
    ref,
) {
    return (
        <div ref={ref} className={cx('wt-empty-state', className)} {...props}>
            {icon ? <div className='wt-empty-state__icon'>{icon}</div> : <div className='wt-empty-state__sparkle'>✦</div>}
            <h3 className='wt-empty-state__title'>{title}</h3>
            {description ? <p className='wt-empty-state__description'>{description}</p> : null}
            {action ? <div className='wt-empty-state__action'>{action}</div> : null}
        </div>
    );
});

export interface ToastOptions {
    title?: ReactNode;
    description?: ReactNode;
    duration?: number;
    closable?: boolean;
}

const toaster = createToaster<ReactNode>({
    placement: 'top-end',
    gap: 12,
    overlap: false,
    max: 5,
    offsets: '1rem',
});

function showToast(tone: Exclude<Tone, 'neutral' | 'accent'>, options: ToastOptions | ReactNode) {
    const normalized: ToastOptions =
        typeof options === 'object' && options !== null && !Array.isArray(options) && !('type' in options)
            ? (options as ToastOptions)
            : { title: options };
    return toaster.create({ type: tone === 'danger' ? 'error' : tone, closable: true, ...normalized });
}

export const toast = {
    show(options: ToastOptions) {
        return toaster.create({ type: 'info', closable: true, ...options });
    },
    info(options: ToastOptions | ReactNode) {
        return showToast('info', options);
    },
    success(options: ToastOptions | ReactNode) {
        return showToast('success', options);
    },
    warning(options: ToastOptions | ReactNode) {
        return showToast('warning', options);
    },
    danger(options: ToastOptions | ReactNode) {
        return showToast('danger', options);
    },
    dismiss(id?: string) {
        toaster.dismiss(id);
    },
};

export interface ToastViewportProps extends Omit<HTMLAttributes<HTMLDivElement>, 'dir'> {
    label?: string;
    dir?: 'ltr' | 'rtl';
}

export function ToastViewport({ className, label = '通知', ...props }: ToastViewportProps) {
    return (
        <ArkToaster toaster={toaster} aria-label={label} className={cx('wt-toaster', className)} {...props}>
            {(item) => (
                <ArkToast.Root className='wt-toast' data-tone={item.type === 'error' ? 'danger' : item.type}>
                    <span className='wt-toast__dot' aria-hidden='true' />
                    <div className='wt-toast__body'>
                        {item.title ? <ArkToast.Title className='wt-toast__title'>{item.title}</ArkToast.Title> : null}
                        {item.description ? (
                            <ArkToast.Description className='wt-toast__description'>{item.description}</ArkToast.Description>
                        ) : null}
                    </div>
                    {item.closable ? (
                        <ArkToast.CloseTrigger className='wt-toast__close' aria-label='关闭通知'>
                            ×
                        </ArkToast.CloseTrigger>
                    ) : null}
                </ArkToast.Root>
            )}
        </ArkToaster>
    );
}

export const Toast = ToastViewport;
