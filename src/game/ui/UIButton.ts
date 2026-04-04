import { GameObjects, Scene } from 'phaser';

export interface UIButtonOptions {
    width: number;
    height: number;
    fillColor: number;
    label?: string;
    fontSize?: number;
    fontColor?: string;
    cornerRadius?: number;
    onPress: () => void;
}

export class UIButton {
    readonly container: GameObjects.Container;
    private bg: GameObjects.Graphics;
    private options: UIButtonOptions;
    private scene: Scene;

    constructor(scene: Scene, x: number, y: number, options: UIButtonOptions) {
        this.scene = scene;
        this.options = options;
        this.container = scene.add.container(x, y);

        this.bg = scene.add.graphics();
        this.drawBackground(options.fillColor, 1);
        this.container.add(this.bg);

        if (options.label) {
            const text = scene.add.text(0, 0, options.label, {
                fontSize: `${options.fontSize ?? 20}px`,
                color: options.fontColor ?? '#ffffff',
                fontFamily: 'Arial, sans-serif',
                fontStyle: 'bold',
                align: 'center',
            });
            text.setOrigin(0.5, 0.5);
            this.container.add(text);
        }

        const hitArea = new Phaser.Geom.Rectangle(
            -options.width / 2,
            -options.height / 2,
            options.width,
            options.height
        );
        this.container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

        this.container.on('pointerdown', () => {
            this.scene.tweens.killTweensOf(this.container);
            this.scene.tweens.add({
                targets: this.container,
                scaleX: 0.9,
                scaleY: 0.9,
                duration: 80,
                ease: 'Quad.easeOut',
            });
            options.onPress();
        });

        this.container.on('pointerup', () => {
            this.scene.tweens.killTweensOf(this.container);
            this.scene.tweens.add({
                targets: this.container,
                scaleX: 1.0,
                scaleY: 1.0,
                duration: 250,
                ease: 'Back.easeOut',
            });
        });

        this.container.on('pointerout', () => {
            this.scene.tweens.killTweensOf(this.container);
            this.scene.tweens.add({
                targets: this.container,
                scaleX: 1.0,
                scaleY: 1.0,
                duration: 250,
                ease: 'Back.easeOut',
            });
        });
    }

    private drawBackground(color: number, alpha: number): void {
        const { width, height, cornerRadius } = this.options;
        const r = cornerRadius ?? 8;
        this.bg.clear();
        this.bg.fillStyle(color, alpha);
        this.bg.fillRoundedRect(-width / 2, -height / 2, width, height, r);
    }

    setHighlight(active: boolean): void {
        this.bg.clear();
        this.drawBackground(this.options.fillColor, 1);
        if (active) {
            this.bg.lineStyle(3, 0xffffff, 1);
            const { width, height, cornerRadius } = this.options;
            const r = cornerRadius ?? 8;
            this.bg.strokeRoundedRect(-width / 2, -height / 2, width, height, r);
        }
    }
}
