import { GameObjects, Scene } from 'phaser';
import { BrushType, BRUSH_CONFIGS } from '../drawing/BrushConfig';
import { BrushManager } from '../drawing/BrushManager';
import { DrawingCanvas } from '../drawing/DrawingCanvas';
import { COLORING_PAGES } from '../config/coloringPages';
import { Toolbar } from '../ui/Toolbar';
import { GamepadNavigator } from '../input/GamepadNavigator';

const CANVAS_HEIGHT = 960;

export class DrawingScene extends Scene {
    private canvas!: DrawingCanvas;
    private brushManager!: BrushManager;
    private currentBrush: BrushType = BrushType.CRAYON;
    private currentColor: number = 0x000000;

    private static readonly BRUSH_STORAGE_KEY = 'kids_drawing_brush';
    private static readonly COLOR_STORAGE_KEY = 'kids_drawing_color';
    private isDrawing: boolean = false;
    private lastPointerX: number = 0;
    private lastPointerY: number = 0;
    private needsRender: boolean = false;
    private cursorGraphics!: GameObjects.Graphics;
    private debugText!: GameObjects.Text;
    private gamepadNav!: GamepadNavigator;
    private toolbar!: Toolbar;
    private modalCursorActive: boolean = false;

    constructor() {
        super('DrawingScene');
    }

    preload(): void {
        COLORING_PAGES.forEach((page) => {
            this.load.svg(`page_thumb_${page.name}`, page.url, { width: 384, height: 192 });
        });
    }

    create(): void {
        this.input.setDefaultCursor('none');

        // Restore saved tool and color
        const savedBrush = localStorage.getItem(DrawingScene.BRUSH_STORAGE_KEY);
        if (savedBrush !== null && Object.values(BrushType).includes(savedBrush as BrushType)) {
            this.currentBrush = savedBrush as BrushType;
        }
        const savedColor = localStorage.getItem(DrawingScene.COLOR_STORAGE_KEY);
        if (savedColor !== null) {
            this.currentColor = parseInt(savedColor, 10);
        }

        this.brushManager = new BrushManager(this);

        this.canvas = new DrawingCanvas(this, 1920, CANVAS_HEIGHT);

        this.toolbar = new Toolbar(this, {
            initialBrush: this.currentBrush,
            initialColor: this.currentColor,
            onBrushChange: (brush) => {
                this.currentBrush = brush;
                localStorage.setItem(DrawingScene.BRUSH_STORAGE_KEY, brush);
                this.drawCursor(this.input.activePointer.x, this.input.activePointer.y);
            },
            onColorChange: (color) => {
                this.currentColor = color;
                localStorage.setItem(DrawingScene.COLOR_STORAGE_KEY, String(color));
                this.drawCursor(this.input.activePointer.x, this.input.activePointer.y);
            },
            onClear: () => {
                this.canvas.clear();
                this.flashCanvas(0.7, 300);
            },
            onLoadPage: (url) => {
                this.canvas.loadPage(url);
            },
            onUndo: () => {
                this.canvas.undo();
                this.flashCanvas(0.15, 200);
            },
            onRedo: () => {
                this.canvas.redo();
                this.flashCanvas(0.15, 200);
            },
        });

        this.cursorGraphics = this.add.graphics();
        this.cursorGraphics.setDepth(200);

        // Gamepad debug display
        this.debugText = this.add.text(10, 10, 'Gamepad: waiting...', {
            fontSize: '18px',
            color: '#ff0000',
            fontFamily: 'monospace',
            backgroundColor: '#000000aa',
            padding: { x: 8, y: 4 },
        });
        this.debugText.setDepth(500);

        // Gamepad navigation (handles all controller input)
        this.gamepadNav = new GamepadNavigator(this, this.toolbar, this.canvas, this.debugText);

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.y > CANVAS_HEIGHT) return;
            if (this.toolbar.pageSelector.isOpen || this.toolbar.colorPalette.isWheelOpen) return;

            if (this.currentBrush === BrushType.FILL) {
                this.canvas.fillAt(pointer.x, pointer.y, this.currentColor);
                return;
            }

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
            this.drawCursor(pointer.x, pointer.y);
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
            if (this.isDrawing) {
                this.isDrawing = false;
                this.canvas.saveWithHistory();
            }
        });
    }

    private flashCanvas(alpha: number, duration: number): void {
        const flash = this.add.graphics();
        flash.setDepth(50);
        flash.fillStyle(0xffffff, 1);
        flash.fillRect(0, 0, 1920, CANVAS_HEIGHT);
        flash.setAlpha(alpha);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration,
            ease: 'Quad.easeOut',
            onComplete: () => flash.destroy(),
        });
    }

    private drawCursor(x: number, y: number): void {
        const g = this.cursorGraphics;
        const config = BRUSH_CONFIGS[this.currentBrush];
        g.clear();

        if (this.currentBrush === BrushType.FILL) {
            // Paint bucket cursor — small bucket shape
            g.fillStyle(this.currentColor, 0.8);
            // Bucket body
            g.fillRect(x - 6, y - 2, 12, 10);
            // Bucket top/rim
            g.lineStyle(2, this.currentColor, 0.8);
            g.lineBetween(x - 8, y - 2, x + 8, y - 2);
            // Handle
            g.lineStyle(2, this.currentColor, 0.6);
            g.lineBetween(x + 6, y - 6, x + 10, y - 10);
            // Pour drip
            g.fillStyle(this.currentColor, 0.5);
            g.fillTriangle(x + 8, y + 8, x + 14, y + 2, x + 14, y + 8);
            return;
        }

        const r = config.radius;
        g.lineStyle(2, this.currentColor, 0.8);
        g.strokeCircle(x, y, r);
        g.lineStyle(1, this.currentColor, 0.5);
        g.lineBetween(x - 4, y, x + 4, y);
        g.lineBetween(x, y - 4, x, y + 4);
    }

    update(): void {
        if (this.needsRender) {
            this.canvas.renderTexture.render();
            this.needsRender = false;
        }

        // Show system cursor when a modal is open, hide it when drawing
        const modalOpen = this.toolbar.pageSelector.isOpen || this.toolbar.colorPalette.isWheelOpen;
        if (modalOpen && !this.modalCursorActive) {
            this.modalCursorActive = true;
            this.input.setDefaultCursor('default');
            this.cursorGraphics.clear();
        } else if (!modalOpen && this.modalCursorActive) {
            this.modalCursorActive = false;
            this.input.setDefaultCursor('none');
        }

        this.gamepadNav.update();
    }
}
