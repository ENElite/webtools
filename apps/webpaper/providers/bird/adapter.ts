import { ApiAdapter } from "../types";
import { BirdPaperItemList, BirdPaperResponse, BirdPaperTag } from "./schema";


const BirdPaperBaseUrl = 'http://wp.birdpaper.com.cn/intf';

// 接口地址 http://wp.birdpaper.com.cn/intf/getCategory
export type BirdPaperCategory = {
    old_id: string; // 分类 ID
    category: string; // 分类名
    show_name: string; // 分类展示名
    position: string; // 总张数
    hot_tag: BirdPaperTag[]; // 热门标签列表
};

export type BirdPaperAPI = 'latest' | 'search' | 'category' | string;

const pageSize = 10;

// 最新壁纸 http://wp.birdpaper.com.cn/intf/newestList?pageno=1&count=10
// 搜索地址 http://wp.birdpaper.com.cn/intf/search?content=搜索关键字&pageno=1&count=10
// 接口地址 http://wp.birdpaper.com.cn/intf/GetListByCategory?cids={分类ID}&pageno=1&count=10
export const BirdPaperAdapter: ApiAdapter = {
    provider: 'BirdPaper',
    fetch: async (api: BirdPaperAPI, params, page) => {
        let url = '';
        switch (api) {
            case 'latest':
                url = `${BirdPaperBaseUrl}/newestList?pageno=${page}&count=${pageSize}`;
                break;
            case 'search':
                url = `${BirdPaperBaseUrl}/search?content=${params["query"]}&pageno=${page}&count=${pageSize}`;
                break;
            case 'category':
                url = `${BirdPaperBaseUrl}/GetListByCategory?cids=${params["categoryId"]}&pageno=${page}&count=${pageSize}`;
                break;
        }
        const response = await fetch(url);
        const data: BirdPaperResponse<BirdPaperItemList> = await response.json();
        return {
            data: BirdPaperAdapter.normalize(data),
            hasMore: BirdPaperAdapter.hasMore(data, page),
        };
    },
    normalize: (raw) => {
        const items = raw.data.list as BirdPaperItemList['list'];
        return items.map(item => ({
            id: `BirdPaper-${item.id}`,
            type: 'image',
            url: item.url,
            provider: 'BirdPaper',
            raw: item,
        }));
    },
    hasMore(raw, page) {
        const total = raw.data.total_page;
        return page < total;
    },
}