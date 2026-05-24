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
    amPmFormat: AmPmFormat;
    showYear: ShowYearPlacement;
    digitFormat: DigitFormat;
    layout: LayoutMode;
    displayOrder: DisplayOrder;
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
    amPmFormat: 'right-english',
    showYear: 'left',
    digitFormat: 'double',
    layout: 'dual-line',
    displayOrder: 'time-first',
};

export const CLOCK_WIDGET_SETTINGS_SCHEMA: InspectorSchema = [
    {
        key: 'layout',
        label: '布局',
        type: 'enum',
        page: 'widget',
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
        key: 'timeFormat',
        label: '时间格式',
        type: 'enum',
        page: 'widget',
        order: 300,
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
        order: 400,
        bind: 'props.amPmFormat',
        visibleWhen: {
            key: 'timeFormat',
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
        order: 500,
        bind: 'props.showSeconds',
    },
    {
        key: 'dateFormat',
        label: '日期格式',
        type: 'enum',
        page: 'widget',
        order: 600,
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
        order: 700,
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
        order: 800,
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
        order: 900,
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
        order: 1000,
        bind: 'props.digitFormat',
        meta: {
            options: [
                { label: '一位数字', value: 'single' },
                { label: '两位数字', value: 'double' },
            ],
        },
    },
    {
        key: 'color',
        label: '文本颜色',
        type: 'color',
        page: 'widget',
        order: 1100,
        bind: 'props.color',
    },
    {
        key: 'textShadowColor',
        label: '阴影颜色',
        type: 'color',
        page: 'widget',
        order: 1200,
        bind: 'props.textShadowColor',
        meta: { alpha: true },
    },
    {
        key: 'textShadowRadius',
        label: '阴影半径',
        type: 'number',
        page: 'widget',
        order: 1300,
        bind: 'props.textShadowRadius',
        meta: { min: 0, max: 100, step: 1 },
    },
    {
        key: 'timeFont',
        label: '时间字体',
        type: 'font',
        page: 'widget',
        order: 1400,
        bind: 'props.timeFont',
    },
    {
        key: 'dateFont',
        label: '日期字体',
        type: 'font',
        page: 'widget',
        order: 1500,
        bind: 'props.dateFont',
    },
    {
        key: 'dateGap',
        label: '间距',
        type: 'number',
        page: 'widget',
        order: 1600,
        bind: 'props.dateGap',
        meta: { min: 0, max: 1.1, step: 0.05 },
    },
];
