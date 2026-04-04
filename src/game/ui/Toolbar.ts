import { GameObjects, Scene } from 'phaser';
import { BrushType } from '../drawing/BrushConfig';
import { ColorPalette } from './ColorPalette';
import { ColoringPageSelector } from './ColoringPageSelector';
import { ToolSelector } from './ToolSelector';
import { UIButton } from './UIButton';

export interface ToolbarCallbacks {
    initialBrush?: BrushType;
    initialColor?: number;
    onBrushChange: (brush: BrushType) => void;
    onColorChange: (color: number) => void;
    onClear: () => void;
    onLoadPage: (url: string) => void;
    onUndo?: () => void;
    onRedo?: () => void;
}

export class Toolbar {
    readonly container: GameObjects.Container;
    readonly toolSelector: ToolSelector;
    readonly colorPalette: ColorPalette;
    readonly pageSelector: ColoringPageSelector;
    private static readonly HEIGHT = 120;
    private static readonly Y = 1080 - 120;

    constructor(scene: Scene, callbacks: ToolbarCallbacks) {
        this.container = scene.add.container(0, Toolbar.Y);
        this.container.setDepth(100);

        // Background bar
        const bg = scene.add.graphics();
        bg.fillStyle(0x333333, 0.92);
        bg.fillRect(0, 0, 1920, Toolbar.HEIGHT);
        this.container.add(bg);

        // Divider line at top
        const divider = scene.add.graphics();
        divider.lineStyle(2, 0x555555, 1);
        divider.lineBetween(0, 0, 1920, 0);
        this.container.add(divider);

        // Tool selector (left side)
        this.toolSelector = new ToolSelector(scene, 80, Toolbar.HEIGHT / 2, callbacks.onBrushChange, callbacks.initialBrush);
        this.container.add(this.toolSelector.container);

        // Undo / Redo buttons
        const undoBtn = new UIButton(scene, 500, Toolbar.HEIGHT / 2, {
            width: 70,
            height: 70,
            fillColor: 0x555555,
            fontSize: 16,
            onPress: () => callbacks.onUndo?.(),
        });
        this.container.add(undoBtn.container);
        this.drawUndoIcon(scene, undoBtn.container);

        const redoBtn = new UIButton(scene, 580, Toolbar.HEIGHT / 2, {
            width: 70,
            height: 70,
            fillColor: 0x555555,
            fontSize: 16,
            onPress: () => callbacks.onRedo?.(),
        });
        this.container.add(redoBtn.container);
        this.drawRedoIcon(scene, redoBtn.container);

        // Color palette (center)
        this.colorPalette = new ColorPalette(scene, 1050, Toolbar.HEIGHT / 2, callbacks.onColorChange, callbacks.initialColor);
        this.container.add(this.colorPalette.container);

        // Coloring pages button
        this.pageSelector = new ColoringPageSelector(scene, callbacks.onLoadPage);
        const pagesBtn = new UIButton(scene, 1710, Toolbar.HEIGHT / 2, {
            width: 100,
            height: 80,
            fillColor: 0x446688,
            fontSize: 18,
            onPress: () => this.pageSelector.toggle(),
        });
        this.container.add(pagesBtn.container);
        this.drawPagesIcon(scene, pagesBtn.container);

        // Clear button (right side)
        const clearBtn = new UIButton(scene, 1840, Toolbar.HEIGHT / 2, {
            width: 100,
            height: 80,
            fillColor: 0xcc3333,
            fontSize: 20,
            onPress: callbacks.onClear,
        });
        this.container.add(clearBtn.container);
        this.drawClearIcon(scene, clearBtn.container);
    }

    private drawUndoIcon(scene: Scene, container: GameObjects.Container): void {
        const g = scene.add.graphics();
        g.lineStyle(3, 0xffffff, 0.9);
        // Curved arrow pointing left
        g.beginPath();
        g.arc(-2, -2, 14, -Math.PI * 0.8, Math.PI * 0.3, false);
        g.strokePath();
        // Arrowhead
        g.fillStyle(0xffffff, 0.9);
        g.fillTriangle(-14, -10, -6, -16, -6, -4);
        container.add(g);
    }

    private drawRedoIcon(scene: Scene, container: GameObjects.Container): void {
        const g = scene.add.graphics();
        g.lineStyle(3, 0xffffff, 0.9);
        g.beginPath();
        g.arc(2, -2, 14, -Math.PI * 0.2, Math.PI * 1.3, false);
        g.strokePath();
        g.fillStyle(0xffffff, 0.9);
        g.fillTriangle(14, -10, 6, -16, 6, -4);
        container.add(g);
    }

    private drawPagesIcon(scene: Scene, container: GameObjects.Container): void {
        const g = scene.add.graphics();
        // Book/pages icon — stacked pages with a fold
        // Back page
        g.lineStyle(2, 0xffffff, 0.5);
        g.strokeRect(-14, -18, 24, 28);
        // Front page
        g.fillStyle(0xffffff, 0.15);
        g.fillRect(-10, -14, 24, 28);
        g.lineStyle(2, 0xffffff, 0.9);
        g.strokeRect(-10, -14, 24, 28);
        // Lines on page (text)
        g.lineStyle(1.5, 0xffffff, 0.6);
        g.lineBetween(-4, -6, 8, -6);
        g.lineBetween(-4, 0, 8, 0);
        g.lineBetween(-4, 6, 4, 6);
        // Label
        const label = scene.add.text(0, 28, 'Pages', {
            fontSize: '12px',
            color: '#cccccc',
            fontFamily: 'Arial, sans-serif',
            align: 'center',
        });
        label.setOrigin(0.5, 0.5);
        container.add(g);
        container.add(label);
    }

    private drawClearIcon(scene: Scene, container: GameObjects.Container): void {
        const g = scene.add.graphics();
        // Trash can icon
        // Can body
        g.lineStyle(2.5, 0xffffff, 0.9);
        g.strokeRect(-10, -10, 20, 24);
        // Lid
        g.lineBetween(-14, -10, 14, -10);
        g.lineBetween(-4, -10, -4, -16);
        g.lineBetween(4, -10, 4, -16);
        g.lineBetween(-4, -16, 4, -16);
        // Lines on can
        g.lineStyle(1.5, 0xffffff, 0.6);
        g.lineBetween(-4, -4, -4, 10);
        g.lineBetween(0, -4, 0, 10);
        g.lineBetween(4, -4, 4, 10);
        // Label
        const label = scene.add.text(0, 28, 'Clear', {
            fontSize: '12px',
            color: '#cccccc',
            fontFamily: 'Arial, sans-serif',
            align: 'center',
        });
        label.setOrigin(0.5, 0.5);
        container.add(g);
        container.add(label);
    }
}
