/**
 * 图片逐像素对比工具
 * 纯函数，不依赖 DOM
 */

export interface DiffOptions {
    /** 容差值 (0-255)，默认 0 表示精确匹配 */
    tolerance?: number;
}

/**
 * 对比两张图片的像素差异
 * 不同尺寸时，以较大尺寸为基准，较小图片不足部分视为白色
 */
export function diffImages(
    imageA: ImageData,
    imageB: ImageData,
    options: DiffOptions = {},
): ImageData {
    const { tolerance = 0 } = options;
    const width = Math.max(imageA.width, imageB.width);
    const height = Math.max(imageA.height, imageB.height);
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;

            const aInBounds = x < imageA.width && y < imageA.height;
            const bInBounds = x < imageB.width && y < imageB.height;

            const rA = aInBounds ? imageA.data[idx] : 255;
            const gA = aInBounds ? imageA.data[idx + 1] : 255;
            const bA = aInBounds ? imageA.data[idx + 2] : 255;
            const aA = aInBounds ? imageA.data[idx + 3] : 255;

            const rB = bInBounds ? imageB.data[idx] : 255;
            const gB = bInBounds ? imageB.data[idx + 1] : 255;
            const bB = bInBounds ? imageB.data[idx + 2] : 255;
            const aB = bInBounds ? imageB.data[idx + 3] : 255;

            const isDifferent =
                Math.abs(rA - rB) > tolerance ||
                Math.abs(gA - gB) > tolerance ||
                Math.abs(bA - bB) > tolerance ||
                Math.abs(aA - aB) > tolerance;

            if (isDifferent) {
                // 有差异 → 黑色
                data[idx] = 0;
                data[idx + 1] = 0;
                data[idx + 2] = 0;
                data[idx + 3] = 255;
            } else {
                // 无差异 → 白色
                data[idx] = 255;
                data[idx + 1] = 255;
                data[idx + 2] = 255;
                data[idx + 3] = 255;
            }
        }
    }

    return new ImageData(data, width, height);
}

/**
 * 从图片 URL 加载并返回 ImageData
 */
export function loadImageData(url: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('无法创建 canvas context'));
                return;
            }
            ctx.drawImage(img, 0, 0);
            resolve(ctx.getImageData(0, 0, img.width, img.height));
        };
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = url;
    });
}

/**
 * 将 ImageData 转换为 Blob URL
 */
export function imageDataToBlobUrl(imageData: ImageData): Promise<string> {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const ctx = canvas.getContext('2d')!;
        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(URL.createObjectURL(blob));
            }
        }, 'image/png');
    });
}
