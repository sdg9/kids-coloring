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

// Index used for the color wheel "swatch"
const WHEEL_INDEX = COLORS.length;

export class ColorPalette {
    readonly container: GameObjects.Container;
    private swatches: GameObjects.Graphics[] = [];
    private selectedIndex: number = 0;
    private onColorChange: (color: number) => void;
    private scene: Scene;
    private customColor: number = 0xff0000;
    private wheelOverlay: GameObjects.Container | null = null;

    constructor(scene: Scene, x: number, y: number, onColorChange: (color: number) => void) {
        this.scene = scene;
        this.onColorChange = onColorChange;
        this.container = scene.add.container(x, y);

        const swatchSize = 50;
        const gap = 8;
        const totalCount = COLORS.length + 1; // +1 for wheel
        const totalWidth = totalCount * swatchSize + (totalCount - 1) * gap;
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
            swatch.on('pointerdown', () => this.select(i));
        });

        // Color wheel button
        const wheelX = startX + COLORS.length * (swatchSize + gap);
        const wheelSwatch = scene.add.graphics();
        this.drawWheelSwatch(wheelSwatch, swatchSize, false);
        wheelSwatch.setPosition(wheelX, 0);
        this.swatches.push(wheelSwatch);
        this.container.add(wheelSwatch);

        const wheelHit = new Phaser.Geom.Circle(0, 0, swatchSize / 2);
        wheelSwatch.setInteractive(wheelHit, Phaser.Geom.Circle.Contains);
        wheelSwatch.on('pointerdown', () => {
            this.select(WHEEL_INDEX);
            this.toggleWheelOverlay();
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
        graphics.lineStyle(1.5, 0x666666, 0.5);
        graphics.strokeCircle(0, 0, size / 2);
    }

    private drawWheelSwatch(graphics: GameObjects.Graphics, size: number, selected: boolean): void {
        graphics.clear();
        if (selected) {
            graphics.lineStyle(4, 0xffffff, 1);
            graphics.strokeCircle(0, 0, size / 2 + 3);
            graphics.lineStyle(2, 0x333333, 1);
            graphics.strokeCircle(0, 0, size / 2 + 5);
        }
        // Draw a mini color wheel
        const r = size / 2;
        const segments = 24;
        for (let i = 0; i < segments; i++) {
            const angle1 = (i / segments) * Math.PI * 2;
            const angle2 = ((i + 1) / segments) * Math.PI * 2;
            const hue = i / segments;
            const color = hslToHex(hue, 1, 0.5);
            graphics.fillStyle(color, 1);
            graphics.fillTriangle(
                0, 0,
                Math.cos(angle1) * r, Math.sin(angle1) * r,
                Math.cos(angle2) * r, Math.sin(angle2) * r,
            );
        }
        graphics.lineStyle(1.5, 0x666666, 0.5);
        graphics.strokeCircle(0, 0, r);
    }

    private select(index: number): void {
        const swatchSize = 50;
        // Deselect old
        if (this.selectedIndex < COLORS.length) {
            this.drawSwatch(this.swatches[this.selectedIndex], COLORS[this.selectedIndex].hex, swatchSize, false);
        } else {
            this.drawWheelSwatch(this.swatches[this.selectedIndex], swatchSize, false);
        }
        // Select new
        this.selectedIndex = index;
        if (index < COLORS.length) {
            this.drawSwatch(this.swatches[index], COLORS[index].hex, swatchSize, true);
            this.onColorChange(COLORS[index].hex);
            this.hideWheelOverlay();
        } else {
            this.drawWheelSwatch(this.swatches[index], swatchSize, true);
            this.onColorChange(this.customColor);
        }
    }

    private toggleWheelOverlay(): void {
        if (this.wheelOverlay) {
            this.hideWheelOverlay();
        } else {
            this.showWheelOverlay();
        }
    }

    private hideWheelOverlay(): void {
        if (this.wheelOverlay) {
            this.wheelOverlay.destroy();
            this.wheelOverlay = null;
        }
    }

    private showWheelOverlay(): void {
        this.hideWheelOverlay();

        const overlay = this.scene.add.container(960, 480);
        overlay.setDepth(250);
        this.wheelOverlay = overlay;

        // Backdrop
        const backdrop = this.scene.add.graphics();
        backdrop.fillStyle(0x000000, 0.5);
        backdrop.fillRect(-960, -480, 1920, 1080);
        backdrop.setInteractive(
            new Phaser.Geom.Rectangle(-960, -480, 1920, 1080),
            Phaser.Geom.Rectangle.Contains
        );
        backdrop.on('pointerdown', () => this.hideWheelOverlay());
        overlay.add(backdrop);

        // Panel
        const panel = this.scene.add.graphics();
        panel.fillStyle(0x444444, 0.95);
        panel.fillRoundedRect(-220, -220, 440, 440, 16);
        panel.lineStyle(2, 0x666666, 1);
        panel.strokeRoundedRect(-220, -220, 440, 440, 16);
        overlay.add(panel);

        // Color wheel
        const wheelRadius = 160;
        const wheelGraphics = this.scene.add.graphics();
        const segments = 64;
        const rings = 20;

        for (let ring = 0; ring < rings; ring++) {
            const saturation = 1 - ring / rings;
            const innerR = (ring / rings) * wheelRadius;
            const outerR = ((ring + 1) / rings) * wheelRadius;

            for (let seg = 0; seg < segments; seg++) {
                const angle1 = (seg / segments) * Math.PI * 2;
                const angle2 = ((seg + 1) / segments) * Math.PI * 2;
                const hue = seg / segments;
                const lightness = 0.3 + 0.2 * saturation;
                const color = hslToHex(hue, saturation, lightness);
                wheelGraphics.fillStyle(color, 1);
                wheelGraphics.beginPath();
                wheelGraphics.arc(0, 0, outerR, angle1, angle2, false);
                wheelGraphics.arc(0, 0, innerR, angle2, angle1, true);
                wheelGraphics.closePath();
                wheelGraphics.fillPath();
            }
        }

        // White center for lightness
        wheelGraphics.fillStyle(0xffffff, 0.3);
        wheelGraphics.fillCircle(0, 0, wheelRadius * 0.15);

        overlay.add(wheelGraphics);

        // Brightness strip below wheel
        const stripY = 185;
        const stripW = 320;
        const stripH = 24;
        const stripGraphics = this.scene.add.graphics();
        const stripSteps = 32;
        for (let i = 0; i < stripSteps; i++) {
            const l = i / (stripSteps - 1);
            const c = hslToHex(0, 0, l);
            stripGraphics.fillStyle(c, 1);
            stripGraphics.fillRect(-stripW / 2 + (i / stripSteps) * stripW, stripY, stripW / stripSteps + 1, stripH);
        }
        stripGraphics.lineStyle(1.5, 0x888888, 0.8);
        stripGraphics.strokeRect(-stripW / 2, stripY, stripW, stripH);
        overlay.add(stripGraphics);

        // Make strip interactive for brightness
        const stripHitArea = new Phaser.Geom.Rectangle(-stripW / 2, stripY, stripW, stripH);
        stripGraphics.setInteractive(stripHitArea, Phaser.Geom.Rectangle.Contains);
        stripGraphics.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            const localX = pointer.x - 960;
            const l = Math.max(0, Math.min(1, (localX + stripW / 2) / stripW));
            this.customColor = hslToHex(0, 0, l);
            this.onColorChange(this.customColor);
            this.hideWheelOverlay();
        });

        // Make wheel interactive
        const wheelHitArea = new Phaser.Geom.Circle(0, 0, wheelRadius);
        wheelGraphics.setInteractive(wheelHitArea, Phaser.Geom.Circle.Contains);
        wheelGraphics.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            const localX = pointer.x - 960;
            const localY = pointer.y - 480;
            const dist = Math.sqrt(localX * localX + localY * localY);
            const angle = Math.atan2(localY, localX);
            const hue = ((angle / (Math.PI * 2)) + 1) % 1;
            const saturation = Math.min(dist / wheelRadius, 1);
            const lightness = 0.3 + 0.2 * saturation;
            this.customColor = hslToHex(hue, saturation, lightness);
            this.onColorChange(this.customColor);
            this.hideWheelOverlay();
        });
    }
}

function hslToHex(h: number, s: number, l: number): number {
    let r: number, g: number, b: number;
    if (s === 0) {
        r = g = b = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hueToRgb(p, q, h + 1 / 3);
        g = hueToRgb(p, q, h);
        b = hueToRgb(p, q, h - 1 / 3);
    }
    return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
}

function hueToRgb(p: number, q: number, t: number): number {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
}
