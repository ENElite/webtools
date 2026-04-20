export type TextWidgetProps = {
    text: string;
    fontSize: number;
    color: string;
    align: 'left' | 'center' | 'right';
    fontWeight: number;
};

export const DEFAULT_TEXT_WIDGET_PROPS: TextWidgetProps = {
    text: 'Webpaper Overlay Text',
    fontSize: 32,
    color: '#f8fafc',
    align: 'center',
    fontWeight: 600,
};
