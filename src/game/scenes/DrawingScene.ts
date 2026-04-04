import { Scene } from 'phaser';
import { BrushType } from '../drawing/BrushConfig';
import { BrushManager } from '../drawing/BrushManager';
import { DrawingCanvas } from '../drawing/DrawingCanvas';
import { Toolbar } from '../ui/Toolbar';

const CANVAS_HEIGHT = 960;

export class DrawingScene extends Scene {
    private canvas!: DrawingCanvas;
    private brushManager!: BrushManager;
    private currentBrush: BrushType = BrushType.CRAYON;
    private currentColor: number = 0x000000;
    private isDrawing: boolean = false;
    private lastPointerX: number = 0;
    private lastPointerY: number = 0;
    private needsRender: boolean = false;

    constructor() {
        super('DrawingScene');
    }

    create(): void {
        this.brushManager = new BrushManager(this);

        this.canvas = new DrawingCanvas(this, 1920, CANVAS_HEIGHT);

        new Toolbar(this, {
            onBrushChange: (brush) => { this.currentBrush = brush; },
            onColorChange: (color) => { this.currentColor = color; },
            onClear: () => {
                this.canvas.clear();
                this.canvas.renderTexture.render();
            },
        });

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.y > CANVAS_HEIGHT) return;
            this.isDrawing = true;
            this.lastPointerX = pointer.x;
            this.lastPointerY = pointer.y;
            this.brushManager.stampAt(
                this.canvas.renderTexture,
                pointer.x, pointer.y,
                this.currentBrush, this.currentColor
            );
            this.needsRender = true;
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!this.isDrawing) return;
            if (pointer.y > CANVAS_HEIGHT) return;
            const dx = pointer.x - this.lastPointerX;
            const dy = pointer.y - this.lastPointerY;
            if (dx * dx + dy * dy > 1) {
                this.brushManager.stampAlongPath(
                    this.canvas.renderTexture,
                    this.lastPointerX, this.lastPointerY,
                    pointer.x, pointer.y,
                    this.currentBrush, this.currentColor
                );
                this.lastPointerX = pointer.x;
                this.lastPointerY = pointer.y;
                this.needsRender = true;
            }
        });

        this.input.on('pointerup', () => {
            this.isDrawing = false;
        });
    }

    update(): void {
        if (this.needsRender) {
            this.canvas.renderTexture.render();
            this.needsRender = false;
        }
    }
}
