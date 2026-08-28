import React from 'react';

type AIFloatingButtonProps = {
    open: boolean;
    onClick: () => void;
};

export function AIFloatingButton({ open, onClick }: AIFloatingButtonProps) {
    return (
        <button
            type='button'
            onClick={onClick}
            title={open ? '关闭 AI 助手' : '打开 AI 助手'}
            style={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 20,
                width: 32,
                height: 32,
                borderRadius: 6,
                border: '1px solid rgba(139, 92, 246, 0.4)',
                background: open
                    ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                    : 'rgba(30, 30, 40, 0.85)',
                color: '#fff',
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: open
                    ? '0 0 12px rgba(139, 92, 246, 0.4)'
                    : '0 2px 8px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(8px)',
                padding: 0,
                lineHeight: 1,
            }}
            onMouseEnter={(e) => {
                if (!open) {
                    e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)';
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.6)';
                }
            }}
            onMouseLeave={(e) => {
                if (!open) {
                    e.currentTarget.style.background = 'rgba(30, 30, 40, 0.85)';
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)';
                }
            }}
        >
            {open ? '✕' : '✦'}
        </button>
    );
}
