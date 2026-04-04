const TOLERANCE = 40;

export function floodFill(
    imageData: ImageData,
    startX: number,
    startY: number,
    fillColor: { r: number; g: number; b: number },
): void {
    const { width, height, data } = imageData;
    const sx = Math.round(startX);
    const sy = Math.round(startY);

    if (sx < 0 || sx >= width || sy < 0 || sy >= height) return;

    const startIdx = (sy * width + sx) * 4;
    const startR = data[startIdx];
    const startG = data[startIdx + 1];
    const startB = data[startIdx + 2];

    // Don't fill if clicking on the same color
    if (
        Math.abs(startR - fillColor.r) < 5 &&
        Math.abs(startG - fillColor.g) < 5 &&
        Math.abs(startB - fillColor.b) < 5
    ) {
        return;
    }

    const visited = new Uint8Array(width * height);
    const stack: number[] = [sx, sy];

    while (stack.length > 0) {
        const y = stack.pop()!;
        const x = stack.pop()!;

        if (x < 0 || x >= width || y < 0 || y >= height) continue;

        const pixelIdx = y * width + x;
        if (visited[pixelIdx]) continue;
        visited[pixelIdx] = 1;

        const idx = pixelIdx * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        if (
            Math.abs(r - startR) > TOLERANCE ||
            Math.abs(g - startG) > TOLERANCE ||
            Math.abs(b - startB) > TOLERANCE
        ) {
            continue;
        }

        data[idx] = fillColor.r;
        data[idx + 1] = fillColor.g;
        data[idx + 2] = fillColor.b;
        data[idx + 3] = 255;

        stack.push(x + 1, y);
        stack.push(x - 1, y);
        stack.push(x, y + 1);
        stack.push(x, y - 1);
    }
}

export function hexToRgb(hex: number): { r: number; g: number; b: number } {
    return {
        r: (hex >> 16) & 0xff,
        g: (hex >> 8) & 0xff,
        b: hex & 0xff,
    };
}
