import { useMemo } from 'react';
import { Descriptions, Space } from 'antd';
import type { MenuProps } from 'antd';
import { App } from 'antd';
import { buildDescriptionItems } from '@/features/paper';
import { defaultWidgetLabel, WidgetKinds } from '@webtools/webwidget'
import type { WidgetKind } from '@webtools/webwidget';
import type { ProviderRecord } from '@/providers';

type ContextMenuProps = {
    isAutoPlaying: boolean;
    canGoNext: boolean;
    canGoPrevious: boolean;
    inHistoryMode: boolean;
    currentRecord: ProviderRecord | null;
    onTogglePlay: () => void;
    onLoadNextImage: () => void;
    onGoToPreviousHistory: () => void;
    onReturnToLatest: () => void;
    onFullScreen: () => void;
    onToggleSettings: () => void;
    onResetAllSettings: () => void;
    onOpenHistory: () => void;
    onCreateWidget: (kind: WidgetKind) => void;
};

const makeItemIcon = (iconClass: string) => (
    <span aria-hidden='true' className={`inline-block h-4 w-4 ${iconClass}`} />
);

const WIDGET_MENU_ITEMS: Array<{ kind: WidgetKind; icon: string }> = [
    { kind: WidgetKinds.TEXT, icon: 'icon-[octicon--typography-16]' },
    { kind: WidgetKinds.HTML, icon: 'icon-[octicon--code-16]' },
    { kind: WidgetKinds.IMAGE, icon: 'icon-[octicon--image-16]' },
    { kind: WidgetKinds.VIDEO, icon: 'icon-[octicon--video-16]' },
    { kind: WidgetKinds.CLOCK, icon: 'icon-[octicon--clock-16]' },
    { kind: WidgetKinds.IFRAME, icon: 'icon-[octicon--code-16]' },
    { kind: WidgetKinds.LIVE2D, icon: 'icon-[octicon--person-16]' },
];

export function useContextMenuItems({
    isAutoPlaying,
    canGoNext,
    canGoPrevious,
    inHistoryMode,
    currentRecord,
    onTogglePlay,
    onLoadNextImage,
    onGoToPreviousHistory,
    onReturnToLatest,
    onFullScreen,
    onToggleSettings,
    onResetAllSettings,
    onOpenHistory,
    onCreateWidget,
}: ContextMenuProps): MenuProps['items'] {
    const { modal } = App.useApp();

    return useMemo<MenuProps['items']>(() => [
        {
            key: 'toggle-play',
            label: isAutoPlaying ? '暂停自动切换' : '开始自动切换',
            icon: makeItemIcon(isAutoPlaying ? 'icon-[octicon--pause-16]' : 'icon-[octicon--play-16]'),
            onClick: onTogglePlay,
        },
        {
            key: 'info',
            label: '当前信息',
            icon: makeItemIcon('icon-[octicon--info-16]'),
            disabled: !currentRecord,
            onClick: () => {
                if (!currentRecord) {
                    return;
                }

                modal.info({
                    title: `#${currentRecord.id} - ${currentRecord.provider}`,
                    content: (
                        <Space orientation='vertical' size='middle' style={{ width: '100%' }}>
                            <Descriptions bordered size='small' items={buildDescriptionItems(currentRecord)} />
                        </Space>
                    ),
                    footer: null,
                    width: 960,
                    destroyOnHidden: true,
                    closable: true,
                });
            },
        },
        {
            key: 'next-image',
            label: '下一张',
            disabled: !canGoNext,
            icon: makeItemIcon('icon-[octicon--arrow-right-16]'),
            onClick: onLoadNextImage,
        },
        {
            key: 'previous-image',
            label: '上一张',
            disabled: !canGoPrevious,
            icon: makeItemIcon('icon-[octicon--arrow-left-16]'),
            onClick: onGoToPreviousHistory,
        },
        {
            key: 'return-latest',
            label: '回到最新',
            disabled: !inHistoryMode,
            icon: makeItemIcon('icon-[octicon--history-16]'),
            onClick: onReturnToLatest,
        },
        {
            key: 'fullscreen',
            label: '全屏',
            icon: makeItemIcon('icon-[octicon--screen-full-16]'),
            onClick: onFullScreen,
        },
        {
            key: 'open-settings',
            label: '设置',
            icon: makeItemIcon('icon-[octicon--gear-16]'),
            onClick: onToggleSettings,
        },
        {
            key: 'reset-settings',
            label: '重置设置',
            icon: makeItemIcon('icon-[octicon--history-16]'),
            onClick: onResetAllSettings,
        },
        {
            key: 'open-history',
            label: '历史记录',
            icon: makeItemIcon('icon-[octicon--history-16]'),
            onClick: onOpenHistory,
        },
        {
            key: 'divider-1',
            type: 'divider',
        },
        {
            key: 'create-widget',
            label: '新建',
            icon: makeItemIcon('icon-[octicon--plus-16]'),
            children: WIDGET_MENU_ITEMS.map(({ kind, icon }) => ({
                key: `create-${kind}-widget`,
                label: defaultWidgetLabel(kind),
                icon: makeItemIcon(icon),
                onClick: () => onCreateWidget(kind),
            })),
        },
    ], [
        currentRecord,
        isAutoPlaying,
        canGoPrevious,
        canGoNext,
        onGoToPreviousHistory,
        onLoadNextImage,
        onResetAllSettings,
        onReturnToLatest,
        onToggleSettings,
        onTogglePlay,
        onFullScreen,
        onOpenHistory,
        onCreateWidget,
        inHistoryMode,
        modal,
    ]);
}
