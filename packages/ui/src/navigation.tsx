'use client';

import {
    Accordion as ArkAccordion,
    Collapsible as ArkCollapsible,
    Drawer as ArkDrawer,
    Menu as ArkMenu,
    Portal,
    SegmentGroup as ArkSegmentGroup,
    Tabs as ArkTabs,
    Tooltip as ArkTooltip,
} from '@ark-ui/react';
import { Fragment, cloneElement, forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
import type {
    ComponentProps,
    HTMLAttributes,
    MouseEventHandler,
    PointerEventHandler,
    ReactElement,
    ReactNode,
} from 'react';

import { cx } from './utils';

export interface ContextMenuItem {
    value: string;
    label: ReactNode;
    icon?: ReactNode;
    shortcut?: ReactNode;
    disabled?: boolean;
    tone?: 'default' | 'danger';
    separatorBefore?: boolean;
    onSelect?: () => void;
    /** Child items are rendered as a real Ark UI submenu. */
    items?: ReadonlyArray<ContextMenuItem>;
}

export interface ContextMenuProps {
    children: ReactElement;
    items: ReadonlyArray<ContextMenuItem>;
    'aria-label'?: string;
    /** Delay before a stationary touch opens the menu. */
    longPressDelay?: number;
    /** Pointer movement in CSS pixels allowed while waiting for a long press. */
    longPressMoveTolerance?: number;
    onOpenChange?: (open: boolean) => void;
}

interface ContextMenuTriggerProps {
    onClick?: MouseEventHandler<HTMLElement>;
    onContextMenu?: MouseEventHandler<HTMLElement>;
    onPointerCancel?: PointerEventHandler<HTMLElement>;
    onPointerDown?: PointerEventHandler<HTMLElement>;
    onPointerMove?: PointerEventHandler<HTMLElement>;
    onPointerUp?: PointerEventHandler<HTMLElement>;
    style?: React.CSSProperties;
}

function menuAriaLabel(item: ContextMenuItem) {
    return typeof item.label === 'string' ? `${item.label} 子菜单` : `${item.value} 子菜单`;
}

function MenuItemContent({ item, submenu = false }: { item: ContextMenuItem; submenu?: boolean }) {
    return (
        <>
            {item.icon ? <span className='wt-menu__icon' aria-hidden='true'>{item.icon}</span> : null}
            <ArkMenu.ItemText className='wt-menu__label'>{item.label}</ArkMenu.ItemText>
            <span className='wt-menu__meta'>
                {item.shortcut ? <span className='wt-menu__shortcut'>{item.shortcut}</span> : null}
                {submenu ? <span className='wt-menu__submenu-indicator' aria-hidden='true'>›</span> : null}
            </span>
        </>
    );
}

function NestedContextMenu({ item, onAction }: { item: ContextMenuItem; onAction: (item: ContextMenuItem) => void }) {
    const childItems = item.items ?? [];
    return (
        <ArkMenu.Root
            lazyMount
            unmountOnExit
            aria-label={menuAriaLabel(item)}
            positioning={{ placement: 'right-start', gutter: 4 }}
        >
            <ArkMenu.TriggerItem className='wt-menu__item wt-menu__item--submenu' data-tone={item.tone ?? 'default'}>
                <MenuItemContent item={item} submenu />
            </ArkMenu.TriggerItem>
            <Portal>
                <ArkMenu.Positioner className='wt-positioner wt-menu__positioner wt-menu__positioner--submenu'>
                    <ArkMenu.Content className='wt-menu' aria-label={menuAriaLabel(item)}>
                        <ContextMenuItems items={childItems} onAction={onAction} />
                    </ArkMenu.Content>
                </ArkMenu.Positioner>
            </Portal>
        </ArkMenu.Root>
    );
}

function ContextMenuItems({
    items,
    onAction,
}: {
    items: ReadonlyArray<ContextMenuItem>;
    onAction: (item: ContextMenuItem) => void;
}) {
    return items.map((item) => (
        <Fragment key={item.value}>
            {item.separatorBefore ? <ArkMenu.Separator className='wt-menu__separator' /> : null}
            {item.items?.length && !item.disabled ? (
                <NestedContextMenu item={item} onAction={onAction} />
            ) : (
                <ArkMenu.Item
                    value={item.value}
                    disabled={item.disabled}
                    className='wt-menu__item'
                    data-tone={item.tone ?? 'default'}
                    onClick={item.disabled ? undefined : () => onAction(item)}
                >
                    <MenuItemContent item={item} submenu={Boolean(item.items?.length)} />
                </ArkMenu.Item>
            )}
        </Fragment>
    ));
}

/** A pointer-positioned menu with desktop context-click, tolerant touch long-press, and nested items. */
export function ContextMenu({
    children,
    items,
    'aria-label': ariaLabel = '快捷菜单',
    longPressDelay = 550,
    longPressMoveTolerance = 10,
    onOpenChange,
}: ContextMenuProps) {
    const [open, setOpen] = useState(false);
    const [anchorPoint, setAnchorPoint] = useState<{ x: number; y: number } | null>(null);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const suppressClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const suppressNextClickRef = useRef(false);
    const openRef = useRef(false);
    const child = children as ReactElement<ContextMenuTriggerProps>;

    const clearLongPress = useCallback(() => {
        if (longPressTimerRef.current !== null) clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
        touchStartRef.current = null;
    }, []);

    const updateOpen = useCallback((nextOpen: boolean) => {
        if (openRef.current === nextOpen) return;
        openRef.current = nextOpen;
        setOpen(nextOpen);
        onOpenChange?.(nextOpen);
    }, [onOpenChange]);

    const runAction = useCallback((item: ContextMenuItem) => {
        item.onSelect?.();
        updateOpen(false);
    }, [updateOpen]);

    useEffect(() => () => {
        clearLongPress();
        if (suppressClickTimerRef.current !== null) clearTimeout(suppressClickTimerRef.current);
    }, [clearLongPress]);

    const trigger = cloneElement(child, {
        onPointerDown: (event) => {
            child.props.onPointerDown?.(event);
            if (event.defaultPrevented || event.pointerType !== 'touch') return;
            clearLongPress();
            const point = { x: event.clientX, y: event.clientY };
            touchStartRef.current = point;
            longPressTimerRef.current = setTimeout(() => {
                longPressTimerRef.current = null;
                setAnchorPoint(point);
                suppressNextClickRef.current = true;
                updateOpen(true);
                if (suppressClickTimerRef.current !== null) clearTimeout(suppressClickTimerRef.current);
                suppressClickTimerRef.current = setTimeout(() => {
                    suppressNextClickRef.current = false;
                    suppressClickTimerRef.current = null;
                }, 800);
            }, Math.max(0, longPressDelay));
        },
        onPointerMove: (event) => {
            child.props.onPointerMove?.(event);
            const start = touchStartRef.current;
            if (!start || event.pointerType !== 'touch') return;
            if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > longPressMoveTolerance) {
                clearLongPress();
            }
        },
        onPointerUp: (event) => {
            child.props.onPointerUp?.(event);
            clearLongPress();
        },
        onPointerCancel: (event) => {
            child.props.onPointerCancel?.(event);
            clearLongPress();
        },
        onClick: (event) => {
            if (suppressNextClickRef.current) {
                suppressNextClickRef.current = false;
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            child.props.onClick?.(event);
        },
        onContextMenu: (event) => {
            child.props.onContextMenu?.(event);
            if (event.defaultPrevented) return;
            event.preventDefault();
            clearLongPress();
            setAnchorPoint({ x: event.clientX, y: event.clientY });
            updateOpen(true);
        },
        style: { WebkitTouchCallout: 'none', ...child.props.style },
    });

    return (
        <ArkMenu.Root
            open={open}
            anchorPoint={anchorPoint}
            onOpenChange={(details) => updateOpen(details.open)}
            lazyMount
            unmountOnExit
            aria-label={ariaLabel}
            positioning={{ gutter: 6 }}
        >
            {trigger}
            <Portal>
                <ArkMenu.Positioner className='wt-positioner wt-menu__positioner'>
                    <ArkMenu.Content className='wt-menu' aria-label={ariaLabel}>
                        <ContextMenuItems items={items} onAction={runAction} />
                    </ArkMenu.Content>
                </ArkMenu.Positioner>
            </Portal>
        </ArkMenu.Root>
    );
}

export interface TabItem {
    value: string;
    label: ReactNode;
    content: ReactNode;
    disabled?: boolean;
}

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
    items: ReadonlyArray<TabItem>;
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    orientation?: 'horizontal' | 'vertical';
    activationMode?: 'automatic' | 'manual';
    fitted?: boolean;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
    {
        className,
        id,
        items,
        value,
        defaultValue,
        onValueChange,
        orientation = 'horizontal',
        activationMode = 'automatic',
        fitted = false,
        ...props
    },
    ref,
) {
    const generatedId = useId();
    return (
        <ArkTabs.Root
            ref={ref}
            id={id ?? generatedId}
            className={cx('wt-tabs', className)}
            value={value}
            defaultValue={defaultValue ?? items[0]?.value}
            onValueChange={(details) => onValueChange?.(details.value)}
            orientation={orientation}
            activationMode={activationMode}
            data-fitted={fitted || undefined}
            {...props}
        >
            <ArkTabs.List className='wt-tabs__list'>
                {items.map((item) => (
                    <ArkTabs.Trigger
                        key={item.value}
                        value={item.value}
                        disabled={item.disabled}
                        className='wt-tabs__trigger'
                    >
                        {item.label}
                    </ArkTabs.Trigger>
                ))}
                <ArkTabs.Indicator className='wt-tabs__indicator' />
            </ArkTabs.List>
            <div className='wt-tabs__panels'>
                {items.map((item) => (
                    <ArkTabs.Content key={item.value} value={item.value} className='wt-tabs__content'>
                        {item.content}
                    </ArkTabs.Content>
                ))}
            </div>
        </ArkTabs.Root>
    );
});

export interface SegmentedControlOption<T extends string = string> {
    value: T;
    label: ReactNode;
    disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string>
    extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
    options: ReadonlyArray<SegmentedControlOption<T>>;
    value?: T;
    defaultValue?: T;
    onValueChange?: (value: T) => void;
    disabled?: boolean;
    name?: string;
    size?: 'sm' | 'md';
}

export const SegmentedControl = forwardRef(function SegmentedControl<T extends string = string>(
    {
        className,
        id,
        options,
        value,
        defaultValue,
        onValueChange,
        disabled,
        name,
        size = 'md',
        ...props
    }: SegmentedControlProps<T>,
    ref: React.ForwardedRef<HTMLDivElement>,
) {
    const generatedId = useId();
    return (
        <ArkSegmentGroup.Root
            ref={ref}
            id={id ?? generatedId}
            className={cx('wt-segmented', className)}
            value={value}
            defaultValue={defaultValue ?? options[0]?.value}
            onValueChange={(details) => {
                if (details.value) onValueChange?.(details.value as T);
            }}
            disabled={disabled}
            name={name}
            data-size={size}
            {...props}
        >
            <ArkSegmentGroup.Indicator className='wt-segmented__indicator' />
            {options.map((option) => (
                <ArkSegmentGroup.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className='wt-segmented__item'
                >
                    <ArkSegmentGroup.ItemHiddenInput />
                    <ArkSegmentGroup.ItemControl />
                    <ArkSegmentGroup.ItemText>{option.label}</ArkSegmentGroup.ItemText>
                </ArkSegmentGroup.Item>
            ))}
        </ArkSegmentGroup.Root>
    );
}) as <T extends string = string>(
    props: SegmentedControlProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> },
) => React.ReactElement;

export interface AccordionItem {
    value: string;
    title: ReactNode;
    content: ReactNode;
    disabled?: boolean;
}

export interface AccordionProps extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
    items: ReadonlyArray<AccordionItem>;
    value?: string[];
    defaultValue?: string[];
    onValueChange?: (value: string[]) => void;
    multiple?: boolean;
    collapsible?: boolean;
}

export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(function Accordion(
    { className, id, items, value, defaultValue, onValueChange, multiple = false, collapsible = true, ...props },
    ref,
) {
    const generatedId = useId();
    return (
        <ArkAccordion.Root
            ref={ref}
            id={id ?? generatedId}
            className={cx('wt-accordion', className)}
            value={value}
            defaultValue={defaultValue}
            onValueChange={(details) => onValueChange?.(details.value)}
            multiple={multiple}
            collapsible={collapsible}
            {...props}
        >
            {items.map((item) => (
                <ArkAccordion.Item key={item.value} value={item.value} disabled={item.disabled} className='wt-accordion__item'>
                    <ArkAccordion.ItemTrigger className='wt-accordion__trigger'>
                        <span>{item.title}</span>
                        <ArkAccordion.ItemIndicator className='wt-accordion__indicator'>⌄</ArkAccordion.ItemIndicator>
                    </ArkAccordion.ItemTrigger>
                    <ArkAccordion.ItemContent className='wt-accordion__content'>
                        <div className='wt-accordion__content-inner'>{item.content}</div>
                    </ArkAccordion.ItemContent>
                </ArkAccordion.Item>
            ))}
        </ArkAccordion.Root>
    );
});

export interface CollapsibleProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
    title: ReactNode;
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    disabled?: boolean;
}

export const Collapsible = forwardRef<HTMLDivElement, CollapsibleProps>(function Collapsible(
    { className, title, open, defaultOpen, onOpenChange, disabled, children, ...props },
    ref,
) {
    return (
        <ArkCollapsible.Root
            ref={ref}
            className={cx('wt-collapsible', className)}
            open={open}
            defaultOpen={defaultOpen}
            onOpenChange={(details) => onOpenChange?.(details.open)}
            disabled={disabled}
            {...props}
        >
            <ArkCollapsible.Trigger className='wt-collapsible__trigger'>
                <span>{title}</span>
                <ArkCollapsible.Indicator className='wt-collapsible__indicator'>⌄</ArkCollapsible.Indicator>
            </ArkCollapsible.Trigger>
            <ArkCollapsible.Content className='wt-collapsible__content'>
                <div className='wt-collapsible__content-inner'>{children}</div>
            </ArkCollapsible.Content>
        </ArkCollapsible.Root>
    );
});

export interface DrawerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    title: ReactNode;
    description?: ReactNode;
    footer?: ReactNode;
    placement?: 'left' | 'right' | 'bottom';
    size?: 'sm' | 'md' | 'lg';
    closeLabel?: string;
    children: ReactNode;
}

export const Drawer = forwardRef<HTMLDivElement, DrawerProps>(function Drawer(
    {
        className,
        open,
        defaultOpen,
        onOpenChange,
        title,
        description,
        footer,
        placement = 'right',
        size = 'md',
        closeLabel = '关闭',
        children,
        ...props
    },
    ref,
) {
    const contentProps = props as ComponentProps<typeof ArkDrawer.Content>;
    return (
        <ArkDrawer.Root
            open={open}
            defaultOpen={defaultOpen}
            onOpenChange={(details) => onOpenChange?.(details.open)}
            swipeDirection={placement === 'bottom' ? 'down' : placement === 'left' ? 'start' : 'end'}
            lazyMount
            unmountOnExit
        >
            <Portal>
                <ArkDrawer.Backdrop className='wt-drawer__backdrop' />
                <ArkDrawer.Positioner className='wt-drawer__positioner' data-placement={placement}>
                    <ArkDrawer.Content
                        ref={ref}
                        className={cx('wt-drawer', className)}
                        data-placement={placement}
                        data-size={size}
                        {...contentProps}
                    >
                        <div className='wt-drawer__header'>
                            <div>
                                <ArkDrawer.Title className='wt-drawer__title'>{title}</ArkDrawer.Title>
                                {description ? (
                                    <ArkDrawer.Description className='wt-drawer__description'>{description}</ArkDrawer.Description>
                                ) : null}
                            </div>
                            <ArkDrawer.CloseTrigger className='wt-drawer__close' aria-label={closeLabel}>
                                ×
                            </ArkDrawer.CloseTrigger>
                        </div>
                        <div className='wt-drawer__body'>{children}</div>
                        {footer ? <div className='wt-drawer__footer'>{footer}</div> : null}
                    </ArkDrawer.Content>
                </ArkDrawer.Positioner>
            </Portal>
        </ArkDrawer.Root>
    );
});

export interface TooltipProps {
    className?: string;
    content: ReactNode;
    children: ReactElement;
    disabled?: boolean;
    placement?: 'top' | 'bottom' | 'left' | 'right';
    openDelay?: number;
    closeDelay?: number;
}

export function Tooltip({
    className,
    content,
    children,
    disabled = false,
    placement = 'top',
    openDelay = 300,
    closeDelay = 100,
}: TooltipProps) {
    if (disabled) return children;

    return (
        <ArkTooltip.Root openDelay={openDelay} closeDelay={closeDelay} positioning={{ placement }}>
            <ArkTooltip.Trigger asChild>{children}</ArkTooltip.Trigger>
            <Portal>
                <ArkTooltip.Positioner className='wt-positioner'>
                    <ArkTooltip.Content className={cx('wt-tooltip', className)}>
                        <ArkTooltip.Arrow>
                            <ArkTooltip.ArrowTip className='wt-tooltip__arrow' />
                        </ArkTooltip.Arrow>
                        {content}
                    </ArkTooltip.Content>
                </ArkTooltip.Positioner>
            </Portal>
        </ArkTooltip.Root>
    );
}
