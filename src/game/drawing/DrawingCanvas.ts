import { GameObjects, Scene } from 'phaser';
import { floodFill, hexToRgb } from './FloodFill';

const STORAGE_KEY = 'kids-drawing-canvas';
const STORAGE_OVERLAY_KEY = 'kids-drawing-overlay';
const MAX_HISTORY = 30;

export class DrawingCanvas {
    readonly renderTexture: GameObjects.RenderTexture;
    private scene: Scene;
    private history: string[] = [];
    private historyIndex: number = -1;
    private lineOverlay: GameObjects.Image | null = null;
    private overlayKeyCounter: number = 0;
    private overlayTextureKey: string | null = null;

    constructor(scene: Scene, width: number, height: number) {
        this.scene = scene;
        this.renderTexture = scene.add.renderTexture(0, 0, width, height);
        this.renderTexture.setOrigin(0, 0);
        this.clear(false);
        this.restore();
    }

    clear(save = true): void {
        this.renderTexture.fill(0xffffff, 1);
        this.renderTexture.render();
        this.removeOverlay();
        if (save) {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(STORAGE_OVERLAY_KEY);
            this.pushHistory();
        }
    }

    save(): void {
        this.snapshotToDataUrl((dataUrl) => {
            try {
                localStorage.setItem(STORAGE_KEY, dataUrl);
            } catch (_e) {
                // localStorage full or other error
            }
        });
    }

    saveWithHistory(): void {
        this.snapshotToDataUrl((dataUrl) => {
            try {
                localStorage.setItem(STORAGE_KEY, dataUrl);
            } catch (_e) {
                // ignore
            }
            if (this.historyIndex < this.history.length - 1) {
                this.history.splice(this.historyIndex + 1);
            }
            this.history.push(dataUrl);
            if (this.history.length > MAX_HISTORY) {
                this.history.shift();
            }
            this.historyIndex = this.history.length - 1;
        });
    }

    private pushHistory(): void {
        this.snapshotToDataUrl((dataUrl) => {
            if (this.historyIndex < this.history.length - 1) {
                this.history.splice(this.historyIndex + 1);
            }
            this.history.push(dataUrl);
            if (this.history.length > MAX_HISTORY) {
                this.history.shift();
            }
            this.historyIndex = this.history.length - 1;
        });
    }

    undo(): void {
        if (this.historyIndex <= 0) return;
        this.historyIndex--;
        this.loadDataUrl(this.history[this.historyIndex]);
    }

    redo(): void {
        if (this.historyIndex >= this.history.length - 1) return;
        this.historyIndex++;
        this.loadDataUrl(this.history[this.historyIndex]);
    }

    fillAt(x: number, y: number, colorHex: number): void {
        this.renderTexture.snapshot((image) => {
            const canvas = document.createElement('canvas');
            const img = image as HTMLImageElement;
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);

            // If there's an overlay, composite its lines so flood fill respects them
            const overlayImg = this.overlayTextureKey
                ? this.scene.textures.get(this.overlayTextureKey)?.getSourceImage() as HTMLImageElement | undefined
                : undefined;

            if (overlayImg) {
                ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
            }

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            floodFill(imageData, x, y, hexToRgb(colorHex));

            if (overlayImg) {
                // Write the filled result, then re-draw overlay lines on top
                // so they stay black and aren't color-shifted by fill
                ctx.putImageData(imageData, 0, 0);
                // Erase the overlay line pixels from the result so the
                // actual RT doesn't bake in the overlay (it's a separate layer)
                // Strategy: re-fill without overlay composited
                const cleanCanvas = document.createElement('canvas');
                cleanCanvas.width = canvas.width;
                cleanCanvas.height = canvas.height;
                const cleanCtx = cleanCanvas.getContext('2d')!;
                cleanCtx.drawImage(img, 0, 0);

                // Get the filled pixels from the composited version,
                // but only apply color changes where the overlay wasn't drawn
                const cleanData = cleanCtx.getImageData(0, 0, canvas.width, canvas.height);
                const filledData = imageData;

                // For each pixel: if the overlay pixel is dark (line), keep original.
                // Otherwise use the filled color.
                const overlayCanvas = document.createElement('canvas');
                overlayCanvas.width = canvas.width;
                overlayCanvas.height = canvas.height;
                const overlayCtx = overlayCanvas.getContext('2d')!;
                overlayCtx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
                const overlayData = overlayCtx.getImageData(0, 0, canvas.width, canvas.height);

                for (let i = 0; i < cleanData.data.length; i += 4) {
                    const oAlpha = overlayData.data[i + 3];
                    if (oAlpha > 128) {
                        // This is an overlay line pixel — keep original drawing
                        continue;
                    }
                    // Use the flood-filled color
                    cleanData.data[i] = filledData.data[i];
                    cleanData.data[i + 1] = filledData.data[i + 1];
                    cleanData.data[i + 2] = filledData.data[i + 2];
                    cleanData.data[i + 3] = filledData.data[i + 3];
                }

                cleanCtx.putImageData(cleanData, 0, 0);
                const dataUrl = cleanCanvas.toDataURL('image/png');
                this.loadDataUrl(dataUrl, () => {
                    this.saveWithHistory();
                });
            } else {
                ctx.putImageData(imageData, 0, 0);
                const dataUrl = canvas.toDataURL('image/png');
                this.loadDataUrl(dataUrl, () => {
                    this.saveWithHistory();
                });
            }
        });
    }

    loadPage(imageUrl: string): void {
        // Remove old overlay first
        this.removeOverlay();

        // Clear canvas to white
        this.renderTexture.fill(0xffffff, 1);
        this.renderTexture.render();

        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            this.createOverlay(img);

            try {
                localStorage.setItem(STORAGE_OVERLAY_KEY, imageUrl);
            } catch (_e) {
                // ignore
            }

            this.saveWithHistory();
        };
        img.src = imageUrl;
    }

    private createOverlay(img: HTMLImageElement): void {
        this.overlayKeyCounter++;
        const key = `__page_overlay_${this.overlayKeyCounter}`;
        this.overlayTextureKey = key;
        this.scene.textures.addImage(key, img);

        this.lineOverlay = this.scene.add.image(
            this.renderTexture.width / 2,
            this.renderTexture.height / 2,
            key
        );
        this.lineOverlay.setDepth(50);
    }

    private removeOverlay(): void {
        if (this.lineOverlay) {
            this.lineOverlay.destroy();
            this.lineOverlay = null;
            this.overlayTextureKey = null;
        }
    }

    private restore(): void {
        const dataUrl = localStorage.getItem(STORAGE_KEY);
        if (dataUrl) {
            const img = new Image();
            img.onload = () => {
                this.stampImage(img, '__restore_canvas');
                this.history = [dataUrl];
                this.historyIndex = 0;
            };
            img.src = dataUrl;
        }

        // Restore the line overlay if one was active
        const overlayUrl = localStorage.getItem(STORAGE_OVERLAY_KEY);
        if (overlayUrl) {
            const overlayImg = new window.Image();
            overlayImg.crossOrigin = 'anonymous';
            overlayImg.onload = () => {
                this.createOverlay(overlayImg);
            };
            overlayImg.src = overlayUrl;
        }
    }

    private snapshotToDataUrl(callback: (dataUrl: string) => void): void {
        this.renderTexture.snapshot((image) => {
            const canvas = document.createElement('canvas');
            const img = image as HTMLImageElement;
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            callback(canvas.toDataURL('image/png'));
        });
    }

    private loadDataUrl(dataUrl: string, onDone?: () => void): void {
        const img = new window.Image();
        img.onload = () => {
            this.stampImage(img, '__history_restore');
            try {
                localStorage.setItem(STORAGE_KEY, dataUrl);
            } catch (_e) {
                // ignore
            }
            onDone?.();
        };
        img.src = dataUrl;
    }

    private stampImage(img: HTMLImageElement, key: string): void {
        if (this.scene.textures.exists(key)) {
            this.scene.textures.remove(key);
        }
        this.scene.textures.addImage(key, img);
        this.renderTexture.fill(0xffffff, 1);
        this.renderTexture.stamp(key, undefined, this.renderTexture.width / 2, this.renderTexture.height / 2);
        this.renderTexture.render();
        this.scene.textures.remove(key);
    }
}
