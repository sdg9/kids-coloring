import { GameObjects, Scene } from 'phaser';
import { BrushType } from '../drawing/BrushConfig';
import { ColorPalette } from './ColorPalette';
import { ToolSelector } from './ToolSelector';
import { UIButton } from './UIButton';

export interface ToolbarCallbacks {
    onBrushChange: (brush: BrushType) => void;
    onColorChange: (color: number) => void;
    onClear: () => void;
}

export class Toolbar {
    readonly container: GameObjects.Container;
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
        const toolSelector = new ToolSelector(scene, 80, Toolbar.HEIGHT / 2, callbacks.onBrushChange);
        this.container.add(toolSelector.container);

        // Color palette (center)
        const colorPalette = new ColorPalette(scene, 960, Toolbar.HEIGHT / 2, callbacks.onColorChange);
        this.container.add(colorPalette.container);

        // Clear button (right side)
        const clearBtn = new UIButton(scene, 1840, Toolbar.HEIGHT / 2, {
            width: 100,
            height: 80,
            fillColor: 0xcc3333,
            label: 'Clear',
            fontSize: 20,
            onPress: callbacks.onClear,
        });
        this.container.add(clearBtn.container);
    }
}
