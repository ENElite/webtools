export type WidgetBackgroundEffect = 'blur' | 'image' | 'none';
export type WidgetBorderStyle = 'solid' | 'dot' | 'dash' | 'dotdash';

export const DEFAULT_WIDGET_COMMON_PROPS = {
    backgroundColor: 'rgba(255, 255, 255, 0)',
    backgroundEffect: 'none' as WidgetBackgroundEffect,
    backgroundImageUrl: '',
    borderColor: '#38bdf8',
    borderWidth: 0,
    borderStyle: 'solid' as WidgetBorderStyle,
    shadowRadius: 0,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
};