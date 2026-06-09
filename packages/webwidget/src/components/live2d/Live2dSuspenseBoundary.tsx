import React, { Suspense } from 'react';
import type { ReactNode } from 'react';
import { Result, Button, Progress } from 'antd';
import { ErrorBoundary } from '../../runtime/ErrorBoundary';

type Live2dSuspenseBoundaryProps = {
    children: ReactNode;
};

/**
 * Live2D 专用的 Suspense + ErrorBoundary 组合边界。
 *
 * - Suspense：在动态导入 l2d 库期间展示加载进度
 * - ErrorBoundary：捕获加载失败或渲染异常，展示错误原因和重试按钮
 */
export function Live2dSuspenseBoundary({ children }: Live2dSuspenseBoundaryProps) {
    return (
        <ErrorBoundary
            errorFallback={({ error, resetError }) => (
                <Result
                    status='error'
                    title='Live2D 加载失败'
                    subTitle={error?.message || '模型加载异常，请检查网络或模型路径'}
                    extra={
                        <Button type='primary' onClick={resetError}>
                            重新加载
                        </Button>
                    }
                    style={{ padding: 12 }}
                />
            )}
        >
            <Suspense
                fallback={
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        padding: 12,
                    }}
                    >
                        <Progress
                            type='circle'
                            size='small'
                            percent={0}
                            showInfo={false}
                            strokeColor='#52c41a'
                            format={() => '初始化...'}
                            status='active'
                        />
                    </div>
                }
            >
                {children}
            </Suspense>
        </ErrorBoundary>
    );
}
