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

        // Panel container (for scale/fade animation) — centered
        this.panelContainer = scene.add.container(960, 480);
        this.container.add(this.panelContainer);

        // Page items container — offset to compensate for panelContainer's position
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

        // Page items container
        this.panelContainer.add(this.pageContainer);

        // Pagination controls
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

            // Interactive hit area on the card container
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

            // Stagger entrance animation if modal is visible (for page navigation)
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

    get isOpen(): boolean {
        return this.visible;
    }

    // Gamepad navigation stubs — kept for GamepadNavigator compatibility
    focusRight(): void {}
    focusLeft(): void {}
    focusDown(): void {}
    focusUp(): void {}
    selectFocused(): void {}

    gamepadNextPage(): void {
        this.nextPage();
    }

    gamepadPrevPage(): void {
        this.prevPage();
    }

    showWithFocus(): void {
        this.show();
    }
}
