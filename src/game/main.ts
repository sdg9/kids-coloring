import { DrawingScene } from './scenes/DrawingScene';
import { AUTO, Game, Scale, Types } from 'phaser';

const config: Types.Core.GameConfig = {
    type: AUTO,
    width: 1920,
    height: 1080,
    parent: 'game-container',
    backgroundColor: '#ffffff',
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH
    },
    input: {
        gamepad: true
    },
    scene: [
        DrawingScene
    ]
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
}

export default StartGame;
