import type { Scene } from 'phaser';
import { Toolbar } from '../ui/Toolbar';
import { DrawingCanvas } from '../drawing/DrawingCanvas';

// Standard gamepad button indices
const BTN_A = 0;
const BTN_B = 1;
const BTN_LB = 4;
const BTN_RB = 5;
const BTN_START = 9;
const BTN_DPAD_UP = 12;
const BTN_DPAD_DOWN = 13;
const BTN_DPAD_LEFT = 14;
const BTN_DPAD_RIGHT = 15;

const STICK_DEADZONE = 0.3;
const STICK_NAV_THRESHOLD = 0.7;

function isVirtualController(id: string): boolean {
    const lower = id.toLowerCase();
    return lower.includes('steam virtual') || lower.includes('steam controller virtual');
}

export class GamepadNavigator {
    private prevButtons: boolean[] = [];
    private prevStickX = 0;
    private prevStickY = 0;
    private debugText: Phaser.GameObjects.Text;
    private toolbar: Toolbar;
    private canvas: DrawingCanvas;

    constructor(
        _scene: Scene,
        toolbar: Toolbar,
        canvas: DrawingCanvas,
        debugText: Phaser.GameObjects.Text,
    ) {
        this.toolbar = toolbar;
        this.canvas = canvas;
        this.debugText = debugText;

        window.addEventListener('gamepadconnected', (e) => {
            const virt = isVirtualController(e.gamepad.id) ? ' (virtual - ignored)' : '';
            this.debugText.setText(`Connected: ${e.gamepad.id}${virt}\nButtons: ${e.gamepad.buttons.length}`);
        });
    }

    update(): void {
        const gamepads = navigator.getGamepads();
        for (const gp of gamepads) {
            if (!gp) continue;
            if (isVirtualController(gp.id)) continue;

            // Initialize previous state
            if (this.prevButtons.length === 0) {
                this.prevButtons = gp.buttons.map(() => false);
            }

            // Check button presses (edge detection)
            for (let i = 0; i < gp.buttons.length; i++) {
                const pressed = gp.buttons[i].pressed;
                const wasPressed = this.prevButtons[i] ?? false;

                if (pressed && !wasPressed) {
                    this.onButtonDown(i, gp.id);
                }

                this.prevButtons[i] = pressed;
            }

            // Check left stick for coloring page navigation
            if (gp.axes.length >= 2) {
                const sx = Math.abs(gp.axes[0]) > STICK_DEADZONE ? gp.axes[0] : 0;
                const sy = Math.abs(gp.axes[1]) > STICK_DEADZONE ? gp.axes[1] : 0;

                const stickRight = sx > STICK_NAV_THRESHOLD && this.prevStickX <= STICK_NAV_THRESHOLD;
                const stickLeft = sx < -STICK_NAV_THRESHOLD && this.prevStickX >= -STICK_NAV_THRESHOLD;
                const stickDown = sy > STICK_NAV_THRESHOLD && this.prevStickY <= STICK_NAV_THRESHOLD;
                const stickUp = sy < -STICK_NAV_THRESHOLD && this.prevStickY >= -STICK_NAV_THRESHOLD;

                if (this.toolbar.pageSelector.isOpen) {
                    if (stickRight) this.toolbar.pageSelector.focusRight();
                    if (stickLeft) this.toolbar.pageSelector.focusLeft();
                    if (stickDown) this.toolbar.pageSelector.focusDown();
                    if (stickUp) this.toolbar.pageSelector.focusUp();
                }

                this.prevStickX = sx;
                this.prevStickY = sy;
            }

            // Only process the first real gamepad
            break;
        }
    }

    private onButtonDown(index: number, padId: string): void {
        this.debugText.setText(`Pad: ${padId}\nBtn: ${index}`);

        const pages = this.toolbar.pageSelector;

        // Coloring page selector mode
        if (pages.isOpen) {
            switch (index) {
                case BTN_DPAD_RIGHT: pages.focusRight(); return;
                case BTN_DPAD_LEFT: pages.focusLeft(); return;
                case BTN_DPAD_DOWN: pages.focusDown(); return;
                case BTN_DPAD_UP: pages.focusUp(); return;
                case BTN_A: pages.selectFocused(); return;
                case BTN_B:
                case BTN_START: pages.hide(); return;
                case BTN_RB: pages.gamepadNextPage(); return;
                case BTN_LB: pages.gamepadPrevPage(); return;
            }
            return;
        }

        // Main toolbar mode
        switch (index) {
            case BTN_DPAD_LEFT:
                this.toolbar.toolSelector.selectPrev();
                break;
            case BTN_DPAD_RIGHT:
                this.toolbar.toolSelector.selectNext();
                break;
            case BTN_DPAD_UP:
                this.toolbar.colorPalette.selectPrev();
                break;
            case BTN_DPAD_DOWN:
                this.toolbar.colorPalette.selectNext();
                break;
            case BTN_LB:
                this.canvas.undo();
                break;
            case BTN_RB:
                this.canvas.redo();
                break;
            case BTN_START:
                this.toolbar.pageSelector.showWithFocus();
                break;
        }
    }
}
