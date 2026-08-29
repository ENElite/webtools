'use client';

import { IconButton } from '@webtools/ui';

type AIFloatingButtonProps = {
    open: boolean;
    onClick: () => void;
};

export function AIFloatingButton({ open, onClick }: AIFloatingButtonProps) {
    return (
        <IconButton
            variant='ghost'
            className={`wt-studio-ai-floating-button${open ? ' wt-studio-ai-floating-button--open' : ''}`}
            aria-label={open ? '关闭 AI 助手' : '打开 AI 助手'}
            aria-pressed={open}
            onClick={onClick}
            title={open ? '关闭 AI 助手' : '打开 AI 助手'}
        >
            <span aria-hidden='true'>{open ? '✕' : '✦'}</span>
        </IconButton>
    );
}
