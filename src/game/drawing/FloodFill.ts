const TOLERANCE = 40;
const LINE_DARKNESS_THRESHOLD = 40;
const DILATE_RADIUS = 3;

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

    if (
        Math.abs(startR - fillColor.r) < 5 &&
        Math.abs(startG - fillColor.g) < 5 &&
        Math.abs(startB - fillColor.b) < 5
    ) {
        return;
    }

    const { isLine, barrier } = buildBarrierMask(data, width, height);

    if (isLine[sy * width + sx]) return;

    // Phase 1: Flood fill using dilated barrier to find the region
    const inRegion = new Uint8Array(width * height);
    const stack: number[] = [sx, sy];

    while (stack.length > 0) {
        const y = stack.pop()!;
        const x = stack.pop()!;

        if (x < 0 || x >= width || y < 0 || y >= height) continue;

        const pixelIdx = y * width + x;
        if (inRegion[pixelIdx]) continue;
        if (barrier[pixelIdx]) continue;

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

        inRegion[pixelIdx] = 1;

        stack.push(x + 1, y);
        stack.push(x - 1, y);
        stack.push(x, y + 1);
        stack.push(x, y - 1);
    }

    // Phase 2: Expand the filled region to include the dilated buffer pixels
    // that border the region, so color reaches right up to the actual lines
    const expanded = new Uint8Array(inRegion);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelIdx = y * width + x;
            // Only expand into barrier pixels that aren't actual line pixels
            if (!barrier[pixelIdx] || isLine[pixelIdx]) continue;
            if (expanded[pixelIdx]) continue;

            // Check if any neighbor is in the filled region
            let adjacent = false;
            for (let dy = -1; dy <= 1 && !adjacent; dy++) {
                for (let dx = -1; dx <= 1 && !adjacent; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        if (inRegion[ny * width + nx]) {
                            adjacent = true;
                        }
                    }
                }
            }
            if (adjacent) expanded[pixelIdx] = 1;
        }
    }

    // Repeat expansion a few times to fill through the full dilate buffer
    for (let pass = 0; pass < DILATE_RADIUS; pass++) {
        const prev = new Uint8Array(expanded);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const pixelIdx = y * width + x;
                if (!barrier[pixelIdx] || isLine[pixelIdx]) continue;
                if (expanded[pixelIdx]) continue;

                let adjacent = false;
                for (let dy = -1; dy <= 1 && !adjacent; dy++) {
                    for (let dx = -1; dx <= 1 && !adjacent; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            if (prev[ny * width + nx]) {
                                adjacent = true;
                            }
                        }
                    }
                }
                if (adjacent) expanded[pixelIdx] = 1;
            }
        }
    }

    // Phase 3: Apply fill color to all expanded region pixels
    for (let i = 0; i < width * height; i++) {
        if (expanded[i]) {
            const idx = i * 4;
            data[idx] = fillColor.r;
            data[idx + 1] = fillColor.g;
            data[idx + 2] = fillColor.b;
            data[idx + 3] = 255;
        }
    }
}

function buildBarrierMask(data: Uint8ClampedArray, width: number, height: number): { isLine: Uint8Array; barrier: Uint8Array } {
    const isLine = new Uint8Array(width * height);
    const barrier = new Uint8Array(width * height);

    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        // Use luminance (perceptual brightness) instead of simple average
        // so saturated colors like green/blue aren't mistaken for dark lines
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        if (luminance < LINE_DARKNESS_THRESHOLD) {
            isLine[i] = 1;
        }
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (isLine[y * width + x]) {
                for (let dy = -DILATE_RADIUS; dy <= DILATE_RADIUS; dy++) {
                    for (let dx = -DILATE_RADIUS; dx <= DILATE_RADIUS; dx++) {
                        if (dx * dx + dy * dy > DILATE_RADIUS * DILATE_RADIUS) continue;
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            barrier[ny * width + nx] = 1;
                        }
                    }
                }
            }
        }
    }

    return { isLine, barrier };
}

export function hexToRgb(hex: number): { r: number; g: number; b: number } {
    return {
        r: (hex >> 16) & 0xff,
        g: (hex >> 8) & 0xff,
        b: hex & 0xff,
    };
}
