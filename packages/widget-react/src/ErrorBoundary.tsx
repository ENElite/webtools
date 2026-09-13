'use client';

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
    readonly children: ReactNode;
    readonly fallback?: ReactNode;
    readonly resetKey?: unknown;
    readonly onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
    readonly error: Error | null;
}

export class WidgetErrorBoundary extends Component<Props, State> {
    override state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    override componentDidCatch(error: Error, info: ErrorInfo): void {
        if (this.props.onError) this.props.onError(error, info);
        else console.error('[widget-react] renderer failed', error, info);
    }

    override componentDidUpdate(previousProps: Props): void {
        if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
            this.setState({ error: null });
        }
    }

    override render(): ReactNode {
        if (!this.state.error) return this.props.children;
        return this.props.fallback ?? (
            <div role='alert' className='wt-widget-error'>
                Widget failed: {this.state.error.message}
            </div>
        );
    }
}
