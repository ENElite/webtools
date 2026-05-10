
export type KonachanQueryParams = {
    tags: string;
    page: number;
    limit?: number;
};

export type KonachanItem = {
    id: number;
    tags: string;
    // 文件属性
    file_url: string;
    file_size: number;
    width: number;
    height: number;
    md5: string;
    // 缩略图属性
    preview_url: string;
    preview_width: number;
    preview_height: number;
    // jpeg 图属性
    jpeg_url: string;
    jpeg_file_size: number;
    jpeg_width: number;
    jpeg_height: number;
    // 样图属性
    sample_url: string;
    sample_file_size: number;
    sample_width: number;
    sample_height: number;
    // 其他属性
    parentId: number | null;
    has_children: boolean;
    // 其他元信息
    creator_id: number;
    created_at: number; // 时间戳
    author: string; // 作者
    source: string; // 来源链接
    rating: string; // 评级 
} & Record<string, string>;

// 接口地址 https://konachan.net/post.json?page=19&tags=rating:safe+loli
export type KonachanResponse = KonachanItem[];
