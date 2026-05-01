import type { WidgetSettingsSchema } from '../settings/schema';

export type DateFormat = 'chinese' | 'numeric1' | 'english' | 'english-short';
export type WeekdayFormat = 'chinese' | 'english' | 'english-short';
export type AmPmFormat = 'chinese' | 'english' | 'english-lower';
export type AmPmPlacement = 'left' | 'right' | 'none';
export type DigitFormat = 'single' | 'double';
export type LayoutMode = 'single-line' | 'dual-line';
export type DatePlacement = 'before-time' | 'after-time' | 'none';

export type ShowYearPlacement = 'left' | 'right' | 'none';
export type WeekdayPlacement = 'left' | 'right' | 'none';

export type ClockWidgetProps = {
    showSeconds: boolean;
    use24Hour: boolean;
    timeFontSize: number;
    dateFontSize: number;
    dateGap: number;
    fontWeight: 400 | 500 | 600 | 700;
    dateFormat: DateFormat;
    weekdayFormat: WeekdayFormat;
    weekdayPlacement: WeekdayPlacement;
    amPmFormat: AmPmFormat;
    amPmPlacement: AmPmPlacement;
    datePlacement: DatePlacement;
    showYear: ShowYearPlacement;
    digitFormat: DigitFormat;
    layout: LayoutMode;
};

export const DEFAULT_CLOCK_WIDGET_PROPS: ClockWidgetProps = {
    showSeconds: true,
    use24Hour: true,
    timeFontSize: 36,
    dateFontSize: 24,
    dateGap: 0.2,
    fontWeight: 600,
    dateFormat: 'chinese',
    weekdayFormat: 'chinese',
    weekdayPlacement: 'right',
    amPmFormat: 'english',
    amPmPlacement: 'right',
    datePlacement: 'after-time',
    showYear: 'left',
    digitFormat: 'double',
    layout: 'dual-line',
};

export const CLOCK_WIDGET_SETTINGS_SCHEMA = [
    {
        key: 'layout',
        label: '布局',
        type: 'enum',
        options: [
            { label: '单行', value: 'single-line' },
            { label: '双行', value: 'dual-line' },
        ],
    },
    {
        key: 'use24Hour',
        label: '24 小时制',
        type: 'boolean',
    },
    {
        key: 'showSeconds',
        label: '显示秒',
        type: 'boolean',
    },
    {
        key: 'amPmFormat',
        label: 'AM/PM 格式',
        type: 'enum',
        options: [
            { label: '中文', value: 'chinese' },
            { label: '英文', value: 'english' },
            { label: '英文小写', value: 'english-lower' },
        ],
    },
    {
        key: 'amPmPlacement',
        label: 'AM/PM 位置',
        type: 'enum',
        options: [
            { label: '左侧', value: 'left' },
            { label: '右侧', value: 'right' },
            { label: '无', value: 'none' },
        ],
    },
    {
        key: 'dateFormat',
        label: '日期格式',
        type: 'enum',
        options: [
            { label: '中文', value: 'chinese' },
            { label: '纯数字', value: 'numeric1' },
            { label: '英文', value: 'english' },
            { label: '英文缩写', value: 'english-short' },
        ],
    },
    {
        key: 'datePlacement',
        label: '日期位置',
        type: 'enum',
        options: [
            { label: '时间之前', value: 'before-time' },
            { label: '时间之后', value: 'after-time' },
            { label: '无', value: 'none' },
        ],
    },
    {
        key: 'digitFormat',
        label: '日期数字',
        type: 'enum',
        options: [
            { label: '一位数字', value: 'single' },
            { label: '两位数字', value: 'double' },
        ],
    },
    {
        key: 'showYear',
        label: '年份位置',
        type: 'enum',
        options: [
            { label: '左侧', value: 'left' },
            { label: '右侧', value: 'right' },
            { label: '无', value: 'none' },
        ],
    },
    {
        key: 'weekdayFormat',
        label: '星期格式',
        type: 'enum',
        options: [
            { label: '中文', value: 'chinese' },
            { label: '英文', value: 'english' },
            { label: '英文缩写', value: 'english-short' },
        ],
    },
    {
        key: 'weekdayPlacement',
        label: '星期位置',
        type: 'enum',
        options: [
            { label: '左侧', value: 'left' },
            { label: '右侧', value: 'right' },
            { label: '无', value: 'none' },
        ],
    },
    {
        key: 'timeFontSize',
        label: '时间字号',
        type: 'number',
        min: 10,
        max: 240,
        step: 1,
    },
    {
        key: 'dateFontSize',
        label: '日期字号',
        type: 'number',
        min: 10,
        max: 240,
        step: 1,
    },
    {
        key: 'dateGap',
        label: '间距',
        type: 'number',
        min: 0,
        max: 1.1,
        step: 0.05,
    },
    {
        key: 'fontWeight',
        label: '字重',
        type: 'enum',
        options: [
            { label: '400', value: 400 },
            { label: '500', value: 500 },
            { label: '600', value: 600 },
            { label: '700', value: 700 },
        ],
    },
] satisfies WidgetSettingsSchema<ClockWidgetProps>;
