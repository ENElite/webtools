import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';

import { cx } from './utils';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';
export type ComponentSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ComponentSize;
    loading?: boolean;
    fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { className, variant = 'primary', size = 'md', loading = false, fullWidth = false, disabled, children, ...props },
    ref,
) {
    return (
        <button
            ref={ref}
            type='button'
            className={cx('wt-button', className)}
            data-variant={variant}
            data-size={size}
            data-full-width={fullWidth || undefined}
            aria-busy={loading || undefined}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? <span className='wt-button__spinner' aria-hidden='true' /> : null}
            <span className='wt-button__content'>{children}</span>
        </button>
    );
});

export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
    'aria-label': string;
    children: React.ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
    { className, children, ...props },
    ref,
) {
    return (
        <Button ref={ref} className={cx('wt-icon-button', className)} {...props}>
            {children}
        </Button>
    );
});

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'plain' | 'raised' | 'tinted';
    interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
    { className, variant = 'plain', interactive = false, ...props },
    ref,
) {
    return (
        <div
            ref={ref}
            className={cx('wt-card', className)}
            data-variant={variant}
            data-interactive={interactive || undefined}
            {...props}
        />
    );
});

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function CardHeader(
    { className, ...props },
    ref,
) {
    return <div ref={ref} className={cx('wt-card__header', className)} {...props} />;
});

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(function CardTitle(
    { className, ...props },
    ref,
) {
    return <h3 ref={ref} className={cx('wt-card__title', className)} {...props} />;
});

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
    function CardDescription({ className, ...props }, ref) {
        return <p ref={ref} className={cx('wt-card__description', className)} {...props} />;
    },
);

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function CardContent(
    { className, ...props },
    ref,
) {
    return <div ref={ref} className={cx('wt-card__content', className)} {...props} />;
});

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function CardFooter(
    { className, ...props },
    ref,
) {
    return <div ref={ref} className={cx('wt-card__footer', className)} {...props} />;
});

export type Tone = 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    tone?: Tone;
    variant?: 'soft' | 'solid' | 'outline';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
    { className, tone = 'neutral', variant = 'soft', ...props },
    ref,
) {
    return (
        <span ref={ref} className={cx('wt-badge', className)} data-tone={tone} data-variant={variant} {...props} />
    );
});

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
    tone?: 'info' | 'success' | 'warning' | 'danger';
    title?: React.ReactNode;
    icon?: React.ReactNode;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
    { className, tone = 'info', title, icon, children, ...props },
    ref,
) {
    return (
        <div ref={ref} role={tone === 'danger' ? 'alert' : 'status'} className={cx('wt-alert', className)} data-tone={tone} {...props}>
            {icon ? <span className='wt-alert__icon'>{icon}</span> : null}
            <div className='wt-alert__body'>
                {title ? <div className='wt-alert__title'>{title}</div> : null}
                {children ? <div className='wt-alert__description'>{children}</div> : null}
            </div>
        </div>
    );
});

export const Toolbar = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Toolbar(
    { className, role = 'toolbar', ...props },
    ref,
) {
    return <div ref={ref} role={role} className={cx('wt-toolbar', className)} {...props} />;
});
