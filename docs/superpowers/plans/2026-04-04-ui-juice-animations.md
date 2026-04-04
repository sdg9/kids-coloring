# UI Juice & Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add kid-friendly bouncy animations to every UI interaction in the drawing game — button presses, tool/color selection, modal open/close, clear flash, undo/redo pulse, and toolbar entrance.

**Architecture:** All animations use Phaser 4's built-in `scene.tweens.add()` with bouncy easings (Back.easeOut, Quad.easeOut). No particles, no new dependencies. Each UI component gets tweens added to its existing interaction handlers. Tween conflicts are prevented by calling `scene.tweens.killTweensOf(target)` before starting new tweens on the same target.

**Tech Stack:** Phaser 4.0.0-rc.5, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-04-ui-juice-animations-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/game/ui/UIButton.ts` | Modify | Add animated press/release tweens |
| `src/game/ui/ToolSelector.ts` | Modify | Add pop-scale on tool selection |
| `src/game/ui/ColorPalette.ts` | Modify | Add swatch scale animations + animated wheel overlay open/close |
| `src/game/ui/ColoringPageSelector.ts` | Modify | Add modal open/close animations + card stagger + hover scale |
| `src/game/ui/Toolbar.ts` | Modify | Add slide-up entrance animation |
| `src/game/scenes/DrawingScene.ts` | Modify | Add clear flash + undo/redo pulse overlays |

---

### Task 1: Animated Button Press/Release

**Files:**
- Modify: `src/game/ui/UIButton.ts`

The UIButton needs a `scene` reference to create tweens. Currently it only uses `scene` in the constructor to create game objects. We need to store it.

- [ ] **Step 1: Add scene property and animated press/release**

Replace the entire `UIButton` class in `src/game/ui/UIButton.ts` with:

```typescript
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
        this.options = options;
        this.scene = scene;
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
            scene.tweens.killTweensOf(this.container);
            scene.tweens.add({
                targets: this.container,
                scaleX: 0.9,
                scaleY: 0.9,
                duration: 80,
                ease: 'Quad.easeOut',
            });
            options.onPress();
        });

        this.container.on('pointerup', () => {
            scene.tweens.killTweensOf(this.container);
            scene.tweens.add({
                targets: this.container,
                scaleX: 1,
                scaleY: 1,
                duration: 250,
                ease: 'Back.easeOut',
            });
        });

        this.container.on('pointerout', () => {
            scene.tweens.killTweensOf(this.container);
            scene.tweens.add({
                targets: this.container,
                scaleX: 1,
                scaleY: 1,
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
```

- [ ] **Step 2: Verify buttons animate**

Run: `npm run dev`

Click any toolbar button. Expected: button squishes to 90% over 80ms on press, bounces back to 100% with slight overshoot over 250ms on release. Rapid clicks should not glitch (killTweensOf prevents stacking).

- [ ] **Step 3: Commit**

```bash
git add src/game/ui/UIButton.ts
git commit -m "feat: add bouncy press/release animation to UIButton"
```

---

### Task 2: Tool Selection Pop Animation

**Files:**
- Modify: `src/game/ui/ToolSelector.ts`

When a tool is selected, the newly selected button gets a pop-scale effect (scale up then settle back). The ToolSelector needs a scene reference for tweens.

- [ ] **Step 1: Add scene reference and pop animation to ToolSelector**

In `src/game/ui/ToolSelector.ts`, store the scene and add a pop tween on selection.

Replace the full file with:

```typescript
import { GameObjects, Scene } from 'phaser';
import { BrushType, BRUSH_CONFIGS } from '../drawing/BrushConfig';
import { UIButton } from './UIButton';

export class ToolSelector {
    readonly container: GameObjects.Container;
    private buttons: UIButton[] = [];
    private selectedIndex: number = 0;
    private scene: Scene;

    constructor(scene: Scene, x: number, y: number, onBrushChange: (brush: BrushType) => void, initialBrush?: BrushType) {
        this.scene = scene;
        this.container = scene.add.container(x, y);

        const brushTypes = [BrushType.CRAYON, BrushType.MARKER, BrushType.PENCIL, BrushType.FILL];
        const initialIndex = initialBrush !== undefined ? brushTypes.indexOf(initialBrush) : 0;
        this.selectedIndex = initialIndex >= 0 ? initialIndex : 0;

        const btnWidth = 90;
        const btnHeight = 80;
        const gap = 8;

        brushTypes.forEach((type, i) => {
            const bx = i * (btnWidth + gap);
            const button = new UIButton(scene, bx, 0, {
                width: btnWidth,
                height: btnHeight,
                fillColor: 0x555555,
                fontSize: 12,
                onPress: () => {
                    this.select(i);
                    onBrushChange(type);
                },
            });
            button.setHighlight(i === this.selectedIndex);
            this.buttons.push(button);
            this.container.add(button.container);

            // Draw icon and label
            this.drawToolIcon(scene, button.container, type);
        });
    }

    private drawToolIcon(scene: Scene, container: GameObjects.Container, type: BrushType): void {
        const g = scene.add.graphics();
        const label = scene.add.text(0, 28, BRUSH_CONFIGS[type].label, {
            fontSize: '12px',
            color: '#cccccc',
            fontFamily: 'Arial, sans-serif',
            align: 'center',
        });
        label.setOrigin(0.5, 0.5);

        switch (type) {
            case BrushType.CRAYON: {
                g.fillStyle(0xffcc00, 0.9);
                g.fillRect(-6, -22, 12, 30);
                g.fillTriangle(-6, -22, 6, -22, 0, -32);
                g.lineStyle(1, 0xaa8800, 0.6);
                g.lineBetween(-6, -10, 6, -10);
                g.lineBetween(-6, -4, 6, -4);
                g.lineBetween(-6, 2, 6, 2);
                break;
            }
            case BrushType.MARKER: {
                g.fillStyle(0x4488ff, 0.9);
                g.fillRect(-7, -18, 14, 28);
                g.fillStyle(0x2255aa, 0.9);
                g.fillRect(-7, -18, 14, 6);
                g.fillStyle(0x333333, 0.9);
                g.fillTriangle(-5, 10, 5, 10, 0, 18);
                break;
            }
            case BrushType.PENCIL: {
                g.fillStyle(0xff6644, 0.9);
                g.fillRect(-4, -24, 8, 32);
                g.fillStyle(0xeebb88, 0.9);
                g.fillTriangle(-4, 8, 4, 8, 0, 18);
                g.fillStyle(0x333333, 0.9);
                g.fillTriangle(-2, 14, 2, 14, 0, 18);
                g.fillStyle(0xff8899, 0.9);
                g.fillRect(-4, -28, 8, 6);
                g.fillStyle(0xcccccc, 0.7);
                g.fillRect(-5, -23, 10, 3);
                break;
            }
            case BrushType.FILL: {
                g.fillStyle(0x66cc66, 0.9);
                g.fillRect(-10, -8, 18, 18);
                g.lineStyle(2.5, 0x44aa44, 1);
                g.lineBetween(-12, -8, 10, -8);
                g.lineStyle(2, 0x888888, 0.8);
                g.beginPath();
                g.arc(0, -14, 10, Math.PI, 0, false);
                g.strokePath();
                g.fillStyle(0x66cc66, 0.7);
                g.fillTriangle(8, 2, 16, -6, 16, 4);
                break;
            }
        }

        container.add(g);
        container.add(label);
    }

    private select(index: number): void {
        this.buttons[this.selectedIndex].setHighlight(false);
        this.selectedIndex = index;
        this.buttons[index].setHighlight(true);

        // Pop-scale animation on the newly selected button
        const btn = this.buttons[index].container;
        this.scene.tweens.killTweensOf(btn);
        this.scene.tweens.add({
            targets: btn,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 150,
            ease: 'Back.easeOut',
            yoyo: true,
            yoyoDelay: 0,
        });
    }
}
```

- [ ] **Step 2: Verify tool selection animates**

Run: `npm run dev`

Click different tools. Expected: the selected tool button briefly pops up to 115% scale and bounces back. The highlight border still draws correctly.

- [ ] **Step 3: Commit**

```bash
git add src/game/ui/ToolSelector.ts
git commit -m "feat: add pop-scale animation on tool selection"
```

---

### Task 3: Color Swatch Selection Animation

**Files:**
- Modify: `src/game/ui/ColorPalette.ts`

Color swatches animate on select/deselect. Selected swatch scales up and stays slightly enlarged; deselected swatch shrinks back.

- [ ] **Step 1: Add scene property and swatch scale animations**

In `src/game/ui/ColorPalette.ts`, modify the `select` method to add tweens. The `scene` is already stored as `this.scene`.

Find the `select` method (around line 127) and replace it with:

```typescript
    private select(index: number): void {
        const swatchSize = 50;

        // Animate deselect old swatch
        const oldSwatch = this.swatches[this.selectedIndex];
        this.scene.tweens.killTweensOf(oldSwatch);
        if (this.selectedIndex < COLORS.length) {
            this.drawSwatch(oldSwatch, COLORS[this.selectedIndex].hex, swatchSize, false);
        } else {
            this.drawWheelSwatch(oldSwatch, swatchSize, false);
        }
        this.scene.tweens.add({
            targets: oldSwatch,
            scaleX: 1,
            scaleY: 1,
            duration: 200,
            ease: 'Quad.easeOut',
        });

        // Select new
        this.selectedIndex = index;
        const newSwatch = this.swatches[index];
        this.scene.tweens.killTweensOf(newSwatch);
        if (index < COLORS.length) {
            this.drawSwatch(newSwatch, COLORS[index].hex, swatchSize, true);
            this.onColorChange(COLORS[index].hex);
            this.hideWheelOverlay();
        } else {
            this.drawWheelSwatch(newSwatch, swatchSize, true);
            this.onColorChange(this.customColor);
        }
        // Pop to 1.25 then settle at 1.15
        this.scene.tweens.add({
            targets: newSwatch,
            scaleX: 1.25,
            scaleY: 1.25,
            duration: 150,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: newSwatch,
                    scaleX: 1.15,
                    scaleY: 1.15,
                    duration: 100,
                    ease: 'Quad.easeOut',
                });
            },
        });
    }
```

- [ ] **Step 2: Verify swatch animations**

Run: `npm run dev`

Click different color swatches. Expected: newly selected swatch pops to 125% and settles at 115%. Previously selected swatch smoothly shrinks to 100%.

- [ ] **Step 3: Commit**

```bash
git add src/game/ui/ColorPalette.ts
git commit -m "feat: add scale animation on color swatch selection"
```

---

### Task 4: Animated Color Wheel Overlay

**Files:**
- Modify: `src/game/ui/ColorPalette.ts`

The wheel overlay (backdrop + panel) currently shows/hides instantly via create/destroy. We'll restructure to separate backdrop from panel content so they can animate independently.

- [ ] **Step 1: Replace showWheelOverlay and hideWheelOverlay**

In `src/game/ui/ColorPalette.ts`, replace `hideWheelOverlay` (around line 155) and `showWheelOverlay` (around line 162) with:

```typescript
    private hideWheelOverlay(): void {
        if (!this.wheelOverlay) return;
        const overlay = this.wheelOverlay;
        this.wheelOverlay = null;

        // Find the panel sub-container (second child after backdrop)
        const backdrop = overlay.getAt(0) as GameObjects.Graphics;
        const panel = overlay.getAt(1) as GameObjects.Container;

        this.scene.tweens.add({
            targets: backdrop,
            alpha: 0,
            duration: 150,
            ease: 'Quad.easeIn',
        });
        this.scene.tweens.add({
            targets: panel,
            scaleX: 0.85,
            scaleY: 0.85,
            alpha: 0,
            duration: 150,
            ease: 'Quad.easeIn',
            onComplete: () => {
                overlay.destroy();
            },
        });
    }

    private showWheelOverlay(): void {
        if (this.wheelOverlay) {
            this.hideWheelOverlay();
        }

        const overlay = this.scene.add.container(960, 480);
        overlay.setDepth(250);
        this.wheelOverlay = overlay;

        // Backdrop
        const backdrop = this.scene.add.graphics();
        backdrop.fillStyle(0x000000, 0.5);
        backdrop.fillRect(-960, -480, 1920, 1080);
        backdrop.setInteractive(
            new Phaser.Geom.Rectangle(-960, -480, 1920, 1080),
            Phaser.Geom.Rectangle.Contains
        );
        backdrop.on('pointerdown', () => this.hideWheelOverlay());
        backdrop.setAlpha(0);
        overlay.add(backdrop);

        // Panel sub-container for scale/fade animation
        const panelContainer = this.scene.add.container(0, 0);
        panelContainer.setAlpha(0);
        panelContainer.setScale(0.85);
        overlay.add(panelContainer);

        // Panel background
        const panel = this.scene.add.graphics();
        panel.fillStyle(0x444444, 0.95);
        panel.fillRoundedRect(-220, -220, 440, 440, 16);
        panel.lineStyle(2, 0x666666, 1);
        panel.strokeRoundedRect(-220, -220, 440, 440, 16);
        panelContainer.add(panel);

        // Color wheel
        const wheelRadius = 160;
        const wheelGraphics = this.scene.add.graphics();
        const segments = 64;
        const rings = 20;

        for (let ring = 0; ring < rings; ring++) {
            const saturation = 1 - ring / rings;
            const innerR = (ring / rings) * wheelRadius;
            const outerR = ((ring + 1) / rings) * wheelRadius;

            for (let seg = 0; seg < segments; seg++) {
                const angle1 = (seg / segments) * Math.PI * 2;
                const angle2 = ((seg + 1) / segments) * Math.PI * 2;
                const hue = seg / segments;
                const lightness = 0.3 + 0.2 * saturation;
                const color = hslToHex(hue, saturation, lightness);
                wheelGraphics.fillStyle(color, 1);
                wheelGraphics.beginPath();
                wheelGraphics.arc(0, 0, outerR, angle1, angle2, false);
                wheelGraphics.arc(0, 0, innerR, angle2, angle1, true);
                wheelGraphics.closePath();
                wheelGraphics.fillPath();
            }
        }

        wheelGraphics.fillStyle(0xffffff, 0.3);
        wheelGraphics.fillCircle(0, 0, wheelRadius * 0.15);
        panelContainer.add(wheelGraphics);

        // Brightness strip below wheel
        const stripY = 185;
        const stripW = 320;
        const stripH = 24;
        const stripGraphics = this.scene.add.graphics();
        const stripSteps = 32;
        for (let i = 0; i < stripSteps; i++) {
            const l = i / (stripSteps - 1);
            const c = hslToHex(0, 0, l);
            stripGraphics.fillStyle(c, 1);
            stripGraphics.fillRect(-stripW / 2 + (i / stripSteps) * stripW, stripY, stripW / stripSteps + 1, stripH);
        }
        stripGraphics.lineStyle(1.5, 0x888888, 0.8);
        stripGraphics.strokeRect(-stripW / 2, stripY, stripW, stripH);
        panelContainer.add(stripGraphics);

        // Make strip interactive for brightness
        const stripHitArea = new Phaser.Geom.Rectangle(-stripW / 2, stripY, stripW, stripH);
        stripGraphics.setInteractive(stripHitArea, Phaser.Geom.Rectangle.Contains);
        stripGraphics.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            const localX = pointer.x - 960;
            const l = Math.max(0, Math.min(1, (localX + stripW / 2) / stripW));
            this.customColor = hslToHex(0, 0, l);
            this.onColorChange(this.customColor);
            this.hideWheelOverlay();
        });

        // Make wheel interactive
        const wheelHitArea = new Phaser.Geom.Circle(0, 0, wheelRadius);
        wheelGraphics.setInteractive(wheelHitArea, Phaser.Geom.Circle.Contains);
        wheelGraphics.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            const localX = pointer.x - 960;
            const localY = pointer.y - 480;
            const dist = Math.sqrt(localX * localX + localY * localY);
            const angle = Math.atan2(localY, localX);
            const hue = ((angle / (Math.PI * 2)) + 1) % 1;
            const saturation = Math.min(dist / wheelRadius, 1);
            const lightness = 0.3 + 0.2 * saturation;
            this.customColor = hslToHex(hue, saturation, lightness);
            this.onColorChange(this.customColor);
            this.hideWheelOverlay();
        });

        // Animate in
        this.scene.tweens.add({
            targets: backdrop,
            alpha: 1,
            duration: 200,
            ease: 'Quad.easeOut',
        });
        this.scene.tweens.add({
            targets: panelContainer,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 250,
            ease: 'Back.easeOut',
        });
    }
```

- [ ] **Step 2: Verify wheel overlay animation**

Run: `npm run dev`

Click the color wheel swatch. Expected: backdrop fades in over 200ms, panel scales from 85% to 100% with bounce over 250ms. Click backdrop or pick a color — overlay fades/shrinks out over 150ms then destroys.

- [ ] **Step 3: Commit**

```bash
git add src/game/ui/ColorPalette.ts
git commit -m "feat: add fade/scale animation to color wheel overlay"
```

---

### Task 5: Animated Coloring Page Selector Modal

**Files:**
- Modify: `src/game/ui/ColoringPageSelector.ts`

This is the largest change. The modal needs animated open/close, staggered card entrance, and hover scale on cards. We need to restructure cards to use containers so they can be individually animated.

- [ ] **Step 1: Add scene property, restructure for animations**

Replace the entire `src/game/ui/ColoringPageSelector.ts` with:

```typescript
import { GameObjects, Scene } from 'phaser';
import { COLORING_PAGES } from '../config/coloringPages';
import { UIButton } from './UIButton';

const COLS = 3;
const ROWS = 2;
const PER_PAGE = COLS * ROWS;
const THUMB_W = 360;
const THUMB_H = 190;
const GAP_X = 30;
const GAP_Y = 50;
const PANEL_X = 200;
const PANEL_Y = 80;
const PANEL_W = 1520;
const PANEL_H = 820;

export class ColoringPageSelector {
    private container: GameObjects.Container;
    private backdrop: GameObjects.Graphics;
    private panelContainer: GameObjects.Container;
    private pageContainer: GameObjects.Container;
    private visible: boolean = false;
    private currentPage: number = 0;
    private totalPages: number;
    private pageText!: GameObjects.Text;
    private isAnimating: boolean = false;

    constructor(
        private scene: Scene,
        private onSelect: (url: string) => void,
    ) {
        this.totalPages = Math.ceil(COLORING_PAGES.length / PER_PAGE);
        this.container = scene.add.container(0, 0);
        this.container.setDepth(300);
        this.container.setVisible(false);

        // Backdrop (separate for independent fade)
        this.backdrop = scene.add.graphics();
        this.backdrop.fillStyle(0x000000, 0.6);
        this.backdrop.fillRect(0, 0, 1920, 1080);
        this.backdrop.setInteractive(
            new Phaser.Geom.Rectangle(0, 0, 1920, 1080),
            Phaser.Geom.Rectangle.Contains
        );
        this.backdrop.on('pointerdown', () => this.hide());
        this.container.add(this.backdrop);

        // Panel container (for scale/fade animation)
        this.panelContainer = scene.add.container(960, 480);
        this.container.add(this.panelContainer);

        this.pageContainer = scene.add.container(-960, -480);

        this.build();
    }

    private build(): void {
        // Panel background
        const panel = this.scene.add.graphics();
        panel.fillStyle(0x3a3a3a, 0.96);
        panel.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 16);
        panel.lineStyle(2, 0x666666, 1);
        panel.strokeRoundedRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 16);
        this.panelContainer.add(panel);

        // Title
        const title = this.scene.add.text(0, -PANEL_H / 2 + 30, 'Choose a Coloring Page', {
            fontSize: '34px',
            color: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
        });
        title.setOrigin(0.5, 0);
        this.panelContainer.add(title);

        // Page items container (gets rebuilt on page change)
        this.panelContainer.add(this.pageContainer);

        // Pagination controls at bottom
        const navY = PANEL_H / 2 - 55;

        const prevBtn = new UIButton(this.scene, -500, navY, {
            width: 80,
            height: 50,
            fillColor: 0x555555,
            label: '<',
            fontSize: 28,
            cornerRadius: 10,
            onPress: () => this.prevPage(),
        });
        this.panelContainer.add(prevBtn.container);

        this.pageText = this.scene.add.text(0, navY, '', {
            fontSize: '22px',
            color: '#cccccc',
            fontFamily: 'Arial, sans-serif',
        });
        this.pageText.setOrigin(0.5, 0.5);
        this.panelContainer.add(this.pageText);

        const nextBtn = new UIButton(this.scene, 500, navY, {
            width: 80,
            height: 50,
            fillColor: 0x555555,
            label: '>',
            fontSize: 28,
            cornerRadius: 10,
            onPress: () => this.nextPage(),
        });
        this.panelContainer.add(nextBtn.container);

        this.renderPage();
    }

    private renderPage(): void {
        this.pageContainer.removeAll(true);

        const startIdx = this.currentPage * PER_PAGE;
        const endIdx = Math.min(startIdx + PER_PAGE, COLORING_PAGES.length);

        const gridW = COLS * THUMB_W + (COLS - 1) * GAP_X;
        const gridStartX = -gridW / 2 + THUMB_W / 2;
        const gridStartY = -PANEL_H / 2 + 100 + THUMB_H / 2;

        for (let i = startIdx; i < endIdx; i++) {
            const page = COLORING_PAGES[i];
            const localIdx = i - startIdx;
            const col = localIdx % COLS;
            const row = Math.floor(localIdx / COLS);
            const cx = gridStartX + col * (THUMB_W + GAP_X);
            const cy = gridStartY + row * (THUMB_H + GAP_Y + 30);

            // Wrap each card in a container for animation
            const cardContainer = this.scene.add.container(cx, cy);

            // Card background
            const card = this.scene.add.graphics();
            card.fillStyle(0x555555, 1);
            card.fillRoundedRect(-THUMB_W / 2, -THUMB_H / 2, THUMB_W, THUMB_H, 10);
            cardContainer.add(card);

            // White inner area
            const inner = this.scene.add.graphics();
            const insetW = THUMB_W - 16;
            const insetH = THUMB_H - 16;
            inner.fillStyle(0xffffff, 1);
            inner.fillRoundedRect(-insetW / 2, -insetH / 2, insetW, insetH, 6);
            cardContainer.add(inner);

            // Thumbnail image
            const thumbKey = `page_thumb_${page.name}`;
            if (this.scene.textures.exists(thumbKey)) {
                const thumb = this.scene.add.image(0, 0, thumbKey);
                const frame = this.scene.textures.getFrame(thumbKey);
                if (frame) {
                    const scaleX = (insetW - 8) / frame.width;
                    const scaleY = (insetH - 8) / frame.height;
                    const scale = Math.min(scaleX, scaleY);
                    thumb.setScale(scale);
                }
                cardContainer.add(thumb);
            }

            // Name label below card
            const label = this.scene.add.text(0, THUMB_H / 2 + 14, page.name, {
                fontSize: '22px',
                color: '#ffffff',
                fontFamily: 'Arial, sans-serif',
                fontStyle: 'bold',
                align: 'center',
            });
            label.setOrigin(0.5, 0);
            cardContainer.add(label);

            // Interactive hit area
            cardContainer.setInteractive(
                new Phaser.Geom.Rectangle(-THUMB_W / 2, -THUMB_H / 2, THUMB_W, THUMB_H),
                Phaser.Geom.Rectangle.Contains
            );
            cardContainer.on('pointerdown', () => {
                this.onSelect(page.url);
                this.hide();
            });
            cardContainer.on('pointerover', () => {
                card.clear();
                card.fillStyle(0x6688aa, 1);
                card.fillRoundedRect(-THUMB_W / 2, -THUMB_H / 2, THUMB_W, THUMB_H, 10);
                this.scene.tweens.killTweensOf(cardContainer);
                this.scene.tweens.add({
                    targets: cardContainer,
                    scaleX: 1.04,
                    scaleY: 1.04,
                    duration: 120,
                    ease: 'Quad.easeOut',
                });
            });
            cardContainer.on('pointerout', () => {
                card.clear();
                card.fillStyle(0x555555, 1);
                card.fillRoundedRect(-THUMB_W / 2, -THUMB_H / 2, THUMB_W, THUMB_H, 10);
                this.scene.tweens.killTweensOf(cardContainer);
                this.scene.tweens.add({
                    targets: cardContainer,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 120,
                    ease: 'Quad.easeOut',
                });
            });

            this.pageContainer.add(cardContainer);

            // Stagger entrance animation if modal is visible
            if (this.visible) {
                cardContainer.setAlpha(0);
                cardContainer.y += 20;
                this.scene.tweens.add({
                    targets: cardContainer,
                    alpha: 1,
                    y: cy,
                    duration: 200,
                    ease: 'Quad.easeOut',
                    delay: localIdx * 40,
                });
            }
        }

        this.pageText.setText(`${this.currentPage + 1} / ${this.totalPages}`);
    }

    private prevPage(): void {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.renderPage();
        }
    }

    private nextPage(): void {
        if (this.currentPage < this.totalPages - 1) {
            this.currentPage++;
            this.renderPage();
        }
    }

    toggle(): void {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }

    show(): void {
        if (this.isAnimating) return;
        this.visible = true;
        this.isAnimating = true;
        this.container.setVisible(true);

        // Reset state for animation
        this.backdrop.setAlpha(0);
        this.panelContainer.setAlpha(0);
        this.panelContainer.setScale(0.9);

        // Animate backdrop
        this.scene.tweens.add({
            targets: this.backdrop,
            alpha: 1,
            duration: 200,
            ease: 'Quad.easeOut',
        });

        // Animate panel
        this.scene.tweens.add({
            targets: this.panelContainer,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.isAnimating = false;
            },
        });

        // Stagger cards in
        const cards = this.pageContainer.getAll() as GameObjects.Container[];
        cards.forEach((cardContainer, i) => {
            const targetY = cardContainer.y;
            cardContainer.setAlpha(0);
            cardContainer.y = targetY + 20;
            this.scene.tweens.add({
                targets: cardContainer,
                alpha: 1,
                y: targetY,
                duration: 200,
                ease: 'Quad.easeOut',
                delay: 100 + i * 40,
            });
        });
    }

    hide(): void {
        if (this.isAnimating || !this.visible) return;
        this.isAnimating = true;

        // Animate out
        this.scene.tweens.add({
            targets: this.backdrop,
            alpha: 0,
            duration: 150,
            ease: 'Quad.easeIn',
        });
        this.scene.tweens.add({
            targets: this.panelContainer,
            scaleX: 0.95,
            scaleY: 0.95,
            alpha: 0,
            duration: 150,
            ease: 'Quad.easeIn',
            onComplete: () => {
                this.visible = false;
                this.isAnimating = false;
                this.container.setVisible(false);
                // Reset scale for next open
                this.panelContainer.setScale(1);
                this.panelContainer.setAlpha(1);
            },
        });
    }
}
```

- [ ] **Step 2: Verify modal animations**

Run: `npm run dev`

Click "Pages" button. Expected:
- Backdrop fades in over 200ms
- Panel scales from 90% to 100% with bounce over 300ms
- Cards stagger in from below with 40ms delays
- Hover a card: gentle scale to 1.04
- Click backdrop or card: panel shrinks to 95% and fades out over 150ms
- Pagination (if multiple pages): cards on new page stagger in

- [ ] **Step 3: Commit**

```bash
git add src/game/ui/ColoringPageSelector.ts
git commit -m "feat: add animated open/close and card stagger to page selector modal"
```

---

### Task 6: Clear Canvas Flash & Undo/Redo Pulse

**Files:**
- Modify: `src/game/scenes/DrawingScene.ts`

Add visual feedback overlays for clear (bright flash) and undo/redo (subtle pulse).

- [ ] **Step 1: Add flash and pulse helper methods**

In `src/game/scenes/DrawingScene.ts`, add two private methods before the `update()` method:

```typescript
    private flashCanvas(alpha: number, duration: number): void {
        const flash = this.add.graphics();
        flash.setDepth(150);
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
```

- [ ] **Step 2: Wire up flash to clear callback**

In the `create()` method, find the `onClear` callback (around line 67) and change it from:

```typescript
            onClear: () => {
                this.canvas.clear();
            },
```

to:

```typescript
            onClear: () => {
                this.canvas.clear();
                this.flashCanvas(0.7, 300);
            },
```

- [ ] **Step 3: Wire up pulse to undo/redo callbacks**

In the `create()` method, find the `onUndo` and `onRedo` callbacks (around lines 72-76) and change them from:

```typescript
            onUndo: () => {
                this.canvas.undo();
            },
            onRedo: () => {
                this.canvas.redo();
            },
```

to:

```typescript
            onUndo: () => {
                this.canvas.undo();
                this.flashCanvas(0.15, 200);
            },
            onRedo: () => {
                this.canvas.redo();
                this.flashCanvas(0.15, 200);
            },
```

- [ ] **Step 4: Verify flash and pulse**

Run: `npm run dev`

- Draw something, then click Clear. Expected: bright white flash (alpha 0.7) fades over 300ms.
- Draw something, then click Undo. Expected: subtle white pulse (alpha 0.15) fades over 200ms.
- Click Redo. Expected: same subtle pulse.

- [ ] **Step 5: Commit**

```bash
git add src/game/scenes/DrawingScene.ts
git commit -m "feat: add white flash on clear and subtle pulse on undo/redo"
```

---

### Task 7: Toolbar Slide-Up Entrance

**Files:**
- Modify: `src/game/ui/Toolbar.ts`

The toolbar slides up from below the screen on scene start. Tool buttons stagger in from the left.

- [ ] **Step 1: Add entrance animation to Toolbar constructor**

In `src/game/ui/Toolbar.ts`, at the end of the constructor (after the clear button, around line 91), add the entrance animation. We need to store the scene reference first.

Replace the constructor signature and first few lines to store scene, then add animation at the end.

Find the constructor (line 24):

```typescript
    constructor(scene: Scene, callbacks: ToolbarCallbacks) {
        this.container = scene.add.container(0, Toolbar.Y);
        this.container.setDepth(100);
```

Replace with:

```typescript
    private scene: Scene;

    constructor(scene: Scene, callbacks: ToolbarCallbacks) {
        this.scene = scene;
        this.container = scene.add.container(0, 1080);  // Start off-screen
        this.container.setDepth(100);
```

Then at the very end of the constructor (after the `drawClearIcon` call), add:

```typescript
        // Slide toolbar up from bottom
        scene.tweens.add({
            targets: this.container,
            y: Toolbar.Y,
            duration: 400,
            ease: 'Back.easeOut',
        });
```

Note: We also need to move the `private scene: Scene;` declaration to be a class property. The full class should have:

```
export class Toolbar {
    readonly container: GameObjects.Container;
    private scene: Scene;
    private static readonly HEIGHT = 120;
    private static readonly Y = 1080 - 120;
```

- [ ] **Step 2: Verify toolbar entrance**

Run: `npm run dev`

Refresh the page. Expected: toolbar slides up from below the screen over 400ms with a slight bounce overshoot. All buttons are visible and functional after animation completes.

- [ ] **Step 3: Commit**

```bash
git add src/game/ui/Toolbar.ts
git commit -m "feat: add slide-up entrance animation for toolbar"
```

---

### Task 8: Final Integration Test

- [ ] **Step 1: Full walkthrough test**

Run: `npm run dev`

Test the complete animation flow:
1. Page loads — toolbar slides up from bottom with bounce
2. Click each tool (Crayon, Marker, Pencil, Fill) — button squishes on press, bounces back, selected tool pops
3. Click different color swatches — selected pops up, deselected shrinks
4. Click color wheel swatch — wheel overlay fades/scales in
5. Pick a color from wheel — overlay fades/scales out
6. Click Pages button — modal fades in, panel scales with bounce, cards stagger in
7. Hover over page cards — gentle scale up
8. Click a card — modal animates out, page loads
9. Draw something, click Undo — subtle pulse
10. Click Redo — subtle pulse
11. Click Clear — bright flash
12. Rapid-click buttons — no animation glitches or stacking

- [ ] **Step 2: Commit all remaining changes (if any)**

```bash
git status
# If any unstaged changes remain:
git add -A
git commit -m "chore: final animation polish and integration fixes"
```
