import type { InspectorSchema } from '../../engine/editor';

export type DateFormat = 'chinese' | 'numeric1' | 'english' | 'english-short';
export type WeekdayFormat = 'chinese' | 'english' | 'english-short';
export type TimeFormat = '24-hour' | '12-hour' | '12-hour-am-pm';
export type AmPmFormat = 'left-chinese' | 'left-english' | 'right-chinese' | 'right-english';
export type DigitFormat = 'single' | 'double';
export type LayoutMode = 'single-line' | 'dual-line';
export type DisplayOrder = 'time-first' | 'date-first';

export type ShowYearPlacement = 'left' | 'right' | 'none';
export type WeekdayPlacement = 'left' | 'right' | 'none';

export type ClockWidgetProps = {
    showSeconds: boolean;
    timeFormat: TimeFormat;
    timeFont: string;
    dateFont: string;
    dateGap: number;
    dateFormat: DateFormat;
    weekdayFormat: WeekdayFormat;
    weekdayPlacement: WeekdayPlacement;
    color: string;
    textShadowColor: string;
    textShadowRadius: number;
    strokeColor: string;
    strokeWidth: number;
    amPmFormat: AmPmFormat;
    showYear: ShowYearPlacement;
    digitFormat: DigitFormat;
    layout: LayoutMode;
    displayOrder: DisplayOrder;
    timeAnimation: boolean;
    timeAnimationDuration: number;
};

export const DEFAULT_CLOCK_WIDGET_PROPS: ClockWidgetProps = {
    showSeconds: true,
    timeFormat: '24-hour',
    timeFont: 'normal 600 36px/1.1 Arial, sans-serif',
    dateFont: 'normal 600 24px/1.1 Arial, sans-serif',
    dateGap: 0.2,
    dateFormat: 'chinese',
    weekdayFormat: 'chinese',
    weekdayPlacement: 'right',
    color: '#fdafd3',
    textShadowColor: 'rgba(255, 255, 255, 1)',
    textShadowRadius: 5,
    strokeColor: 'transparent',
    strokeWidth: 0,
    amPmFormat: 'right-english',
    showYear: 'left',
    digitFormat: 'double',
    layout: 'dual-line',
    displayOrder: 'time-first',
    timeAnimation: true,
    timeAnimationDuration: 0.3,
};

export const CLOCK_WIDGET_SETTINGS_SCHEMA: InspectorSchema = [
    // ── 通用 ──────────────────────────────────────────────────────
    {
        key: 'layout',
        label: '布局',
        type: 'enum',
        page: 'widget',
        group: '通用',
        order: 100,
        bind: 'props.layout',
        meta: {
            options: [
                { label: '单行', value: 'single-line' },
                { label: '双行', value: 'dual-line' },
            ],
        },
    },
    {
        key: 'displayOrder',
        label: '显示顺序',
        type: 'enum',
        page: 'widget',
        group: '通用',
        order: 200,
        bind: 'props.displayOrder',
        meta: {
            options: [
                { label: '时间在前', value: 'time-first' },
                { label: '日期在前', value: 'date-first' },
            ],
        },
    },
    {
        key: 'dateGap',
        label: '间距',
        type: 'number',
        page: 'widget',
        group: '通用',
        order: 300,
        bind: 'props.dateGap',
        meta: { min: 0, max: 1.1, step: 0.05 },
    },
    {
        key: 'color',
        label: '文本颜色',
        type: 'color',
        page: 'widget',
        group: '通用',
        order: 400,
        bind: 'props.color',
    },
    {
        key: 'textShadowColor',
        label: '阴影颜色',
        type: 'color',
        page: 'widget',
        group: '通用',
        order: 500,
        bind: 'props.textShadowColor',
        meta: { alpha: true },
    },
    {
        key: 'textShadowRadius',
        label: '阴影半径',
        type: 'number',
        page: 'widget',
        group: '通用',
        order: 600,
        bind: 'props.textShadowRadius',
        meta: { min: 0, max: 100, step: 1 },
    },
    {
        key: 'strokeColor',
        label: '描边颜色',
        type: 'color',
        page: 'widget',
        group: '通用',
        order: 650,
        bind: 'props.strokeColor',
        meta: { alpha: true },
    },
    {
        key: 'strokeWidth',
        label: '描边宽度',
        type: 'number',
        page: 'widget',
        group: '通用',
        order: 660,
        bind: 'props.strokeWidth',
        meta: { min: 0, max: 10, step: 0.5 },
    },
    {
        key: 'timeFont',
        label: '时间字体',
        type: 'font',
        page: 'widget',
        group: '通用',
        order: 700,
        bind: 'props.timeFont',
    },
    {
        key: 'dateFont',
        label: '日期字体',
        type: 'font',
        page: 'widget',
        group: '通用',
        order: 800,
        bind: 'props.dateFont',
    },
    {
        key: 'timeAnimation',
        label: '时间动画',
        type: 'switch',
        page: 'widget',
        group: '通用',
        order: 900,
        bind: 'props.timeAnimation',
    },
    {
        key: 'timeAnimationDuration',
        label: '动画时长',
        type: 'slider',
        page: 'widget',
        group: '通用',
        order: 1000,
        bind: 'props.timeAnimationDuration',
        meta: { min: 0.1, max: 2, step: 0.1, unit: 's' },
    },
    // ── 时间 ──────────────────────────────────────────────────────
    {
        key: 'timeFormat',
        label: '时间格式',
        type: 'enum',
        page: 'widget',
        group: '时间',
        order: 1100,
        bind: 'props.timeFormat',
        meta: {
            options: [
                { label: '24 小时', value: '24-hour' },
                { label: '12 小时', value: '12-hour' },
                { label: '12 小时带 AM/PM', value: '12-hour-am-pm' },
            ],
        },
    },
    {
        key: 'amPmFormat',
        label: 'AM/PM 格式',
        type: 'enum',
        page: 'widget',
        group: '时间',
        order: 1200,
        bind: 'props.amPmFormat',
        visibleWhen: {
            field: 'props.timeFormat',
            equals: '12-hour-am-pm',
        },
        meta: {
            options: [
                { label: '左侧中文', value: 'left-chinese' },
                { label: '左侧英文', value: 'left-english' },
                { label: '右侧中文', value: 'right-chinese' },
                { label: '右侧英文', value: 'right-english' },
            ],
        },
    },
    {
        key: 'showSeconds',
        label: '显示秒',
        type: 'switch',
        page: 'widget',
        group: '时间',
        order: 1300,
        bind: 'props.showSeconds',
    },
    // ── 日期 ──────────────────────────────────────────────────────
    {
        key: 'dateFormat',
        label: '日期格式',
        type: 'enum',
        page: 'widget',
        group: '日期',
        order: 1400,
        bind: 'props.dateFormat',
        meta: {
            options: [
                { label: '中文', value: 'chinese' },
                { label: '纯数字', value: 'numeric1' },
                { label: '英文', value: 'english' },
                { label: '英文缩写', value: 'english-short' },
            ],
        },
    },
    {
        key: 'showYear',
        label: '年份位置',
        type: 'enum',
        page: 'widget',
        group: '日期',
        order: 1500,
        bind: 'props.showYear',
        meta: {
            options: [
                { label: '左侧', value: 'left' },
                { label: '右侧', value: 'right' },
                { label: '无', value: 'none' },
            ],
        },
    },
    {
        key: 'weekdayFormat',
        label: '星期格式',
        type: 'enum',
        page: 'widget',
        group: '日期',
        order: 1600,
        bind: 'props.weekdayFormat',
        meta: {
            options: [
                { label: '中文', value: 'chinese' },
                { label: '英文', value: 'english' },
                { label: '英文缩写', value: 'english-short' },
            ],
        },
    },
    {
        key: 'weekdayPlacement',
        label: '星期位置',
        type: 'enum',
        page: 'widget',
        group: '日期',
        order: 1700,
        bind: 'props.weekdayPlacement',
        meta: {
            options: [
                { label: '左侧', value: 'left' },
                { label: '右侧', value: 'right' },
                { label: '无', value: 'none' },
            ],
        },
    },
    {
        key: 'digitFormat',
        label: '日期数字',
        type: 'enum',
        page: 'widget',
        group: '日期',
        order: 1800,
        bind: 'props.digitFormat',
        meta: {
            options: [
                { label: '一位数字', value: 'single' },
                { label: '两位数字', value: 'double' },
            ],
        },
    },
];
