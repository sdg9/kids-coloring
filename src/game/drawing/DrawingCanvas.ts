import { GameObjects, Scene } from 'phaser';

export class DrawingCanvas {
    readonly renderTexture: GameObjects.RenderTexture;

    constructor(scene: Scene, width: number, height: number) {
        this.renderTexture = scene.add.renderTexture(0, 0, width, height);
        this.renderTexture.setOrigin(0, 0);
        this.clear();
    }

    clear(): void {
        this.renderTexture.fill(0xffffff, 1);
        this.renderTexture.render();
    }
}
