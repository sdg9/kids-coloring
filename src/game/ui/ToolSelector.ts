import { GameObjects, Scene } from 'phaser';
import { BrushType, BRUSH_CONFIGS } from '../drawing/BrushConfig';
import { UIButton } from './UIButton';

export class ToolSelector {
    readonly container: GameObjects.Container;
    private buttons: UIButton[] = [];
    private selectedIndex: number = 0;

    constructor(scene: Scene, x: number, y: number, onBrushChange: (brush: BrushType) => void, initialBrush?: BrushType) {
        this.container = scene.add.container(x, y);

        const brushTypes = [BrushType.CRAYON, BrushType.MARKER, BrushType.PENCIL, BrushType.FILL];
        const initialIndex = initialBrush !== undefined ? brushTypes.indexOf(initialBrush) : 0;
        this.selectedIndex = initialIndex >= 0 ? initialIndex : 0;

        const btnWidth = 90;
        const btnHeight = 80;
        const gap = 8;

        brushTypes.forEach((type, i) => {
            const bx = i * (btnWidth + gap);
            const button = new UIButton(scene, bx, 0, {
                width: btnWidth,
                height: btnHeight,
                fillColor: 0x555555,
                fontSize: 12,
                onPress: () => {
                    this.select(i);
                    onBrushChange(type);
                },
            });
            button.setHighlight(i === this.selectedIndex);
            this.buttons.push(button);
            this.container.add(button.container);

            // Draw icon and label
            this.drawToolIcon(scene, button.container, type);
        });
    }

    private drawToolIcon(scene: Scene, container: GameObjects.Container, type: BrushType): void {
        const g = scene.add.graphics();
        const label = scene.add.text(0, 28, BRUSH_CONFIGS[type].label, {
            fontSize: '12px',
            color: '#cccccc',
            fontFamily: 'Arial, sans-serif',
            align: 'center',
        });
        label.setOrigin(0.5, 0.5);

        switch (type) {
            case BrushType.CRAYON: {
                // Crayon shape — stubby with wavy tip
                g.fillStyle(0xffcc00, 0.9);
                g.fillRect(-6, -22, 12, 30);
                g.fillTriangle(-6, -22, 6, -22, 0, -32);
                // Wrapper lines
                g.lineStyle(1, 0xaa8800, 0.6);
                g.lineBetween(-6, -10, 6, -10);
                g.lineBetween(-6, -4, 6, -4);
                g.lineBetween(-6, 2, 6, 2);
                break;
            }
            case BrushType.MARKER: {
                // Marker — rectangular body with chisel tip
                g.fillStyle(0x4488ff, 0.9);
                g.fillRect(-7, -18, 14, 28);
                // Cap
                g.fillStyle(0x2255aa, 0.9);
                g.fillRect(-7, -18, 14, 6);
                // Tip
                g.fillStyle(0x333333, 0.9);
                g.fillTriangle(-5, 10, 5, 10, 0, 18);
                break;
            }
            case BrushType.PENCIL: {
                // Pencil — long thin with eraser
                g.fillStyle(0xff6644, 0.9);
                g.fillRect(-4, -24, 8, 32);
                // Wood/tip
                g.fillStyle(0xeebb88, 0.9);
                g.fillTriangle(-4, 8, 4, 8, 0, 18);
                // Lead
                g.fillStyle(0x333333, 0.9);
                g.fillTriangle(-2, 14, 2, 14, 0, 18);
                // Eraser
                g.fillStyle(0xff8899, 0.9);
                g.fillRect(-4, -28, 8, 6);
                // Metal band
                g.fillStyle(0xcccccc, 0.7);
                g.fillRect(-5, -23, 10, 3);
                break;
            }
            case BrushType.FILL: {
                // Paint bucket
                g.fillStyle(0x66cc66, 0.9);
                // Bucket body
                g.fillRect(-10, -8, 18, 18);
                // Bucket rim
                g.lineStyle(2.5, 0x44aa44, 1);
                g.lineBetween(-12, -8, 10, -8);
                // Handle
                g.lineStyle(2, 0x888888, 0.8);
                g.beginPath();
                g.arc(0, -14, 10, Math.PI, 0, false);
                g.strokePath();
                // Pour
                g.fillStyle(0x66cc66, 0.7);
                g.fillTriangle(8, 2, 16, -6, 16, 4);
                break;
            }
        }

        container.add(g);
        container.add(label);
    }

    private select(index: number): void {
        this.buttons[this.selectedIndex].setHighlight(false);
        this.selectedIndex = index;
        this.buttons[index].setHighlight(true);
    }
}
