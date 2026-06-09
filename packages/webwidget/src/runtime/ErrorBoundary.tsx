import React from 'react';
import type { ReactNode, ComponentType } from 'react';
import { Result, Button } from 'antd';

export type ErrorFallbackProps = {
    error: Error;
    resetError: () => void;
};

/**
 * 默认的 Error Fallback 组件，使用 antd Result 展示错误信息和重试按钮。
 */
function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
    return (
        <Result
            status='error'
            title='组件加载异常'
            subTitle={error?.message || '发生未知错误'}
            extra={
                <Button type='primary' onClick={resetError}>
                    重新加载
                </Button>
            }
            style={{ padding: 12 }}
        />
    );
}

export type ErrorBoundaryProps = {
    children: ReactNode;
    /** 自定义错误回退组件，覆盖默认的 antd Result */
    errorFallback?: ComponentType<ErrorFallbackProps>;
    /** 可选的错误回调 */
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
};

type ErrorBoundaryState = {
    hasError: boolean;
    error: Error | null;
};

/**
 * 错误边界组件，用于捕获子组件的渲染错误并展示降级 UI。
 *
 * - 捕获子组件树中的渲染错误，阻止错误向上传播导致全局 crash
 * - 默认使用 antd Result 展示错误信息和重试按钮
 * - 可通过 errorFallback prop 自定义错误回退组件
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }

    resetError = () => {
        this.setState({ hasError: false, error: null });
    };

    override render() {
        if (this.state.hasError && this.state.error) {
            const FallbackComponent = this.props.errorFallback ?? DefaultErrorFallback;
            return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
        }
        return this.props.children;
    }
}
