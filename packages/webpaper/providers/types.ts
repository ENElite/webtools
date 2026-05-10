import { BirdPaperItem } from "./bird/schema";
import { KonachanItem } from "./konachan/types";

export type Provider = 'Konachan' | 'BirdPaper' | 'Json';
export type ItemType = 'image' | 'video';

export interface ProviderRecordBase {
    id: string; // 历史记录唯一 ID
    type: ItemType;
    provider: Provider
    url: string;
    preview?: string;
    raw?: any; // 原始数据，供详情页使用
}

interface BirdPaperRecord extends ProviderRecordBase {
    provider: 'BirdPaper';
    raw: BirdPaperItem;
}

interface JsonRecord extends ProviderRecordBase {
    provider: 'Json';
}

interface KonachanRecord extends ProviderRecordBase {
    provider: 'Konachan';
    raw: KonachanItem;
}

export type ProviderRecord =
    | KonachanRecord
    | BirdPaperRecord
    | JsonRecord

/**
 * 标准化后的分页响应，store 只认识这个结构
 */
export interface PageResult {
    data: ProviderRecord[]
    hasMore: boolean
}

/**
 * 每个接口需要实现的 adapter 契约
 * T = 该接口返回的实体类型
 * P = 该接口的查询参数类型
 */
export interface ApiAdapter<P = Record<string, unknown>> {
    /**
     * 接口唯一标识，作为 key 的前缀
     */
    provider: Provider;

    /**
     * 发起分页请求，返回标准化结果
     * adapter 内部负责处理路径、参数格式、认证头等一切差异
     */
    fetch: (api: string, params: P, page: number) => Promise<PageResult>

    /**
     * 从原始响应体中提取实体列表
     * fetch 内部调用，也可单独用于处理 websocket 推送等场景
     */
    normalize: (raw: any) => ProviderRecord[]

    /**
     * 判断是否还有下一页
     * 不同接口判断方式各异：total 字段、hasNext 标志、返回数组是否为空……
     */
    hasMore: (raw: any, page: number) => boolean

    /**
     * 可选：参数序列化为 cache key 的一部分
     * 默认用 JSON.stringify，有特殊需求时覆盖
     */
    serializeParams?: (params: P) => string
}