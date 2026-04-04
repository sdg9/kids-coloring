import { GameObjects, Scene } from 'phaser';
import { BrushType, BRUSH_CONFIGS } from '../drawing/BrushConfig';
import { UIButton } from './UIButton';

export class ToolSelector {
    readonly container: GameObjects.Container;
    private buttons: UIButton[] = [];
    private selectedIndex: number = 0;

    constructor(scene: Scene, x: number, y: number, onBrushChange: (brush: BrushType) => void) {
        this.container = scene.add.container(x, y);

        const brushTypes = [BrushType.CRAYON, BrushType.MARKER, BrushType.PENCIL];
        const btnWidth = 90;
        const btnHeight = 80;
        const gap = 8;
        const startX = 0;

        brushTypes.forEach((type, i) => {
            const config = BRUSH_CONFIGS[type];
            const bx = startX + i * (btnWidth + gap);
            const button = new UIButton(scene, bx, 0, {
                width: btnWidth,
                height: btnHeight,
                fillColor: 0x555555,
                label: config.label,
                fontSize: 18,
                onPress: () => {
                    this.select(i);
                    onBrushChange(type);
                },
            });
            button.setHighlight(i === 0);
            this.buttons.push(button);
            this.container.add(button.container);
        });
    }

    private select(index: number): void {
        this.buttons[this.selectedIndex].setHighlight(false);
        this.selectedIndex = index;
        this.buttons[index].setHighlight(true);
    }
}
