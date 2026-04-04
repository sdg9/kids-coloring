import { GameObjects, Scene } from 'phaser';
import { BrushType, BRUSH_CONFIGS, BrushConfig } from './BrushConfig';

export class BrushManager {
    private textureKeys: Map<string, string[]> = new Map();

    constructor(scene: Scene) {
        this.generateTextures(scene);
    }

    private generateTextures(scene: Scene): void {
        for (const config of Object.values(BRUSH_CONFIGS)) {
            const keys: string[] = [];
            for (let i = 0; i < config.textureVariants; i++) {
                const key = `brush_${config.type}_${i}`;
                this.generateBrushTexture(scene, key, config);
                keys.push(key);
            }
            this.textureKeys.set(config.type, keys);
        }
    }

    private generateBrushTexture(scene: Scene, key: string, config: BrushConfig): void {
        const size = config.radius * 2 + 8;
        const cx = size / 2;
        const cy = size / 2;

        const rt = scene.add.renderTexture(0, 0, size, size);
        rt.setVisible(false);

        const g = scene.add.graphics();
        g.fillStyle(0xffffff, 1);

        switch (config.type) {
            case BrushType.CRAYON: {
                const blobCount = 7;
                for (let i = 0; i < blobCount; i++) {
                    const angle = (i / blobCount) * Math.PI * 2;
                    const dist = Math.random() * config.radius * 0.3;
                    const ox = cx + Math.cos(angle) * dist;
                    const oy = cy + Math.sin(angle) * dist;
                    const r = config.radius * (0.6 + Math.random() * 0.4);
                    g.fillCircle(ox, oy, r);
                }
                g.fillCircle(cx, cy, config.radius * 0.8);
                break;
            }
            case BrushType.MARKER:
                g.fillCircle(cx, cy, config.radius);
                break;
            case BrushType.PENCIL:
                g.fillCircle(cx, cy, config.radius);
                break;
        }

        g.generateTexture(key, size, size);
        g.destroy();
        rt.destroy();
    }

    stampAt(
        renderTexture: GameObjects.RenderTexture,
        x: number,
        y: number,
        brushType: BrushType,
        color: number,
    ): void {
        const config = BRUSH_CONFIGS[brushType];
        const keys = this.textureKeys.get(brushType)!;
        const key = keys[Math.floor(Math.random() * keys.length)];

        const jitterX = config.jitter > 0 ? (Math.random() - 0.5) * config.jitter * 2 : 0;
        const jitterY = config.jitter > 0 ? (Math.random() - 0.5) * config.jitter * 2 : 0;

        renderTexture.stamp(key, undefined, x + jitterX, y + jitterY, {
            alpha: config.alpha,
            tint: color,
        });
    }

    stampAlongPath(
        renderTexture: GameObjects.RenderTexture,
        fromX: number,
        fromY: number,
        toX: number,
        toY: number,
        brushType: BrushType,
        color: number,
    ): void {
        const config = BRUSH_CONFIGS[brushType];
        const dx = toX - fromX;
        const dy = toY - fromY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const step = Math.max(config.spacing * config.radius * 2, 1);

        if (dist < 1) {
            this.stampAt(renderTexture, toX, toY, brushType, color);
            return;
        }

        const steps = Math.ceil(dist / step);
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const px = fromX + dx * t;
            const py = fromY + dy * t;
            this.stampAt(renderTexture, px, py, brushType, color);
        }
    }
}
