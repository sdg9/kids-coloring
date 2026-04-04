import { GameObjects, Scene } from 'phaser';

export interface ColorEntry {
    name: string;
    hex: number;
}

export const COLORS: ColorEntry[] = [
    { name: 'Black', hex: 0x000000 },
    { name: 'Red', hex: 0xFF0000 },
    { name: 'Orange', hex: 0xFF8800 },
    { name: 'Yellow', hex: 0xFFDD00 },
    { name: 'Green', hex: 0x00CC00 },
    { name: 'Blue', hex: 0x0066FF },
    { name: 'Purple', hex: 0x8800CC },
    { name: 'Pink', hex: 0xFF66AA },
    { name: 'Brown', hex: 0x885522 },
    { name: 'White', hex: 0xFFFFFF },
    { name: 'Light Blue', hex: 0x66CCFF },
    { name: 'Light Green', hex: 0x88FF44 },
];

export class ColorPalette {
    readonly container: GameObjects.Container;
    private swatches: GameObjects.Graphics[] = [];
    private selectedIndex: number = 0;
    private onColorChange: (color: number) => void;

    constructor(scene: Scene, x: number, y: number, onColorChange: (color: number) => void) {
        this.onColorChange = onColorChange;
        this.container = scene.add.container(x, y);

        const swatchSize = 50;
        const gap = 8;
        const totalWidth = COLORS.length * swatchSize + (COLORS.length - 1) * gap;
        const startX = -totalWidth / 2 + swatchSize / 2;

        COLORS.forEach((color, i) => {
            const sx = startX + i * (swatchSize + gap);
            const swatch = scene.add.graphics();
            this.drawSwatch(swatch, color.hex, swatchSize, i === this.selectedIndex);
            swatch.setPosition(sx, 0);
            this.swatches.push(swatch);
            this.container.add(swatch);

            const hitArea = new Phaser.Geom.Circle(0, 0, swatchSize / 2);
            swatch.setInteractive(hitArea, Phaser.Geom.Circle.Contains);

            swatch.on('pointerdown', () => {
                this.select(i);
            });
        });
    }

    private drawSwatch(graphics: GameObjects.Graphics, color: number, size: number, selected: boolean): void {
        graphics.clear();
        if (selected) {
            graphics.lineStyle(4, 0xffffff, 1);
            graphics.strokeCircle(0, 0, size / 2 + 3);
            graphics.lineStyle(2, 0x333333, 1);
            graphics.strokeCircle(0, 0, size / 2 + 5);
        }
        graphics.fillStyle(color, 1);
        graphics.fillCircle(0, 0, size / 2);
        // Border for visibility (especially for white/light colors)
        graphics.lineStyle(1.5, 0x666666, 0.5);
        graphics.strokeCircle(0, 0, size / 2);
    }

    private select(index: number): void {
        const swatchSize = 50;
        // Deselect old
        this.drawSwatch(this.swatches[this.selectedIndex], COLORS[this.selectedIndex].hex, swatchSize, false);
        // Select new
        this.selectedIndex = index;
        this.drawSwatch(this.swatches[index], COLORS[index].hex, swatchSize, true);
        this.onColorChange(COLORS[index].hex);
    }
}
