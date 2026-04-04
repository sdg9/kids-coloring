import { GameObjects, Scene, Input } from 'phaser';
import { BrushType, BRUSH_CONFIGS } from '../drawing/BrushConfig';
import { BrushManager } from '../drawing/BrushManager';
import { DrawingCanvas } from '../drawing/DrawingCanvas';
import { COLORING_PAGES } from '../config/coloringPages';
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
    private cursorGraphics!: GameObjects.Graphics;
    private debugText!: GameObjects.Text;
    private prevButtonStates: boolean[] = [];

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

        this.brushManager = new BrushManager(this);

        this.canvas = new DrawingCanvas(this, 1920, CANVAS_HEIGHT);

        new Toolbar(this, {
            onBrushChange: (brush) => {
                this.currentBrush = brush;
                this.drawCursor(this.input.activePointer.x, this.input.activePointer.y);
            },
            onColorChange: (color) => {
                this.currentColor = color;
                this.drawCursor(this.input.activePointer.x, this.input.activePointer.y);
            },
            onClear: () => {
                this.canvas.clear();
            },
            onLoadPage: (url) => {
                this.canvas.loadPage(url);
            },
            onUndo: () => {
                this.canvas.undo();
            },
            onRedo: () => {
                this.canvas.redo();
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

        // Phaser gamepad events
        this.input.gamepad?.on('down', (pad: Input.Gamepad.Gamepad, button: Input.Gamepad.Button, _value: number) => {
            this.debugText.setText(`Phaser Pad: ${pad.id}\nBtn index: ${button.index}`);
            if (button.index === 4) this.canvas.undo();
            else if (button.index === 5) this.canvas.redo();
        });

        // Browser Gamepad API fallback — poll in update()
        // Also listen for gamepad connection
        window.addEventListener('gamepadconnected', (e) => {
            this.debugText.setText(`Connected: ${e.gamepad.id}\nButtons: ${e.gamepad.buttons.length}`);
        });

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.y > CANVAS_HEIGHT) return;

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

        // Browser Gamepad API polling (fallback for when Phaser gamepad events don't fire)
        const gamepads = navigator.getGamepads();
        for (const gp of gamepads) {
            if (!gp) continue;

            // Initialize previous state tracking
            if (this.prevButtonStates.length === 0) {
                this.prevButtonStates = gp.buttons.map(() => false);
            }

            for (let i = 0; i < gp.buttons.length; i++) {
                const pressed = gp.buttons[i].pressed;
                const wasPressed = this.prevButtonStates[i] ?? false;

                if (pressed && !wasPressed) {
                    // Button just pressed
                    this.debugText.setText(`Pad: ${gp.id}\nBtn index: ${i}\nPressed`);

                    if (i === 4) this.canvas.undo();
                    else if (i === 5) this.canvas.redo();
                }

                this.prevButtonStates[i] = pressed;
            }
        }
    }
}
