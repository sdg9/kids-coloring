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
    private pageContainer: GameObjects.Container;
    private visible: boolean = false;
    private currentPage: number = 0;
    private totalPages: number;
    private pageText!: GameObjects.Text;
    private focusIndex: number = 0;
    private focusGraphics: GameObjects.Graphics | null = null;
    private cardPositions: { x: number; y: number }[] = [];

    constructor(
        private scene: Scene,
        private onSelect: (url: string) => void,
    ) {
        this.totalPages = Math.ceil(COLORING_PAGES.length / PER_PAGE);
        this.container = scene.add.container(0, 0);
        this.container.setDepth(300);
        this.container.setVisible(false);

        this.pageContainer = scene.add.container(0, 0);

        this.build();
    }

    private build(): void {
        // Dimmed backdrop
        const backdrop = this.scene.add.graphics();
        backdrop.fillStyle(0x000000, 0.6);
        backdrop.fillRect(0, 0, 1920, 1080);
        backdrop.setInteractive(
            new Phaser.Geom.Rectangle(0, 0, 1920, 1080),
            Phaser.Geom.Rectangle.Contains
        );
        backdrop.on('pointerdown', () => this.hide());
        this.container.add(backdrop);

        // Panel background — interactive so clicks inside the panel don't dismiss
        const panel = this.scene.add.graphics();
        panel.fillStyle(0x3a3a3a, 0.96);
        panel.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 16);
        panel.lineStyle(2, 0x666666, 1);
        panel.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 16);
        panel.setInteractive(
            new Phaser.Geom.Rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H),
            Phaser.Geom.Rectangle.Contains
        );
        this.container.add(panel);

        // Title
        const title = this.scene.add.text(960, PANEL_Y + 30, 'Choose a Coloring Page', {
            fontSize: '34px',
            color: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
        });
        title.setOrigin(0.5, 0);
        this.container.add(title);

        // Page items container (gets rebuilt on page change)
        this.container.add(this.pageContainer);

        // Pagination controls at bottom
        const navY = PANEL_Y + PANEL_H - 55;

        const prevBtn = new UIButton(this.scene, 370, navY, {
            width: 175,
            height: 88,
            fillColor: 0x555555,
            label: '<',
            fontSize: 44,
            cornerRadius: 14,
            onPress: () => this.prevPage(),
        });
        this.container.add(prevBtn.container);

        this.pageText = this.scene.add.text(960, navY, '', {
            fontSize: '22px',
            color: '#cccccc',
            fontFamily: 'Arial, sans-serif',
        });
        this.pageText.setOrigin(0.5, 0.5);
        this.container.add(this.pageText);

        const nextBtn = new UIButton(this.scene, 1550, navY, {
            width: 175,
            height: 88,
            fillColor: 0x555555,
            label: '>',
            fontSize: 44,
            cornerRadius: 14,
            onPress: () => this.nextPage(),
        });
        this.container.add(nextBtn.container);

        this.renderPage();
    }

    private renderPage(): void {
        // Clear previous items
        this.pageContainer.removeAll(true);
        this.cardPositions = [];

        if (this.focusGraphics) {
            this.focusGraphics.destroy();
            this.focusGraphics = null;
        }

        const startIdx = this.currentPage * PER_PAGE;
        const endIdx = Math.min(startIdx + PER_PAGE, COLORING_PAGES.length);

        const gridW = COLS * THUMB_W + (COLS - 1) * GAP_X;
        const gridStartX = 960 - gridW / 2 + THUMB_W / 2;
        const gridStartY = PANEL_Y + 100 + THUMB_H / 2;

        for (let i = startIdx; i < endIdx; i++) {
            const page = COLORING_PAGES[i];
            const localIdx = i - startIdx;
            const col = localIdx % COLS;
            const row = Math.floor(localIdx / COLS);
            const cx = gridStartX + col * (THUMB_W + GAP_X);
            const cy = gridStartY + row * (THUMB_H + GAP_Y + 30);
            this.cardPositions.push({ x: cx, y: cy });

            // Card background
            const card = this.scene.add.graphics();
            card.fillStyle(0x555555, 1);
            card.fillRoundedRect(-THUMB_W / 2, -THUMB_H / 2, THUMB_W, THUMB_H, 10);
            card.setPosition(cx, cy);
            this.pageContainer.add(card);

            // White inner area for the preview
            const inner = this.scene.add.graphics();
            const insetW = THUMB_W - 16;
            const insetH = THUMB_H - 16;
            inner.fillStyle(0xffffff, 1);
            inner.fillRoundedRect(-insetW / 2, -insetH / 2, insetW, insetH, 6);
            inner.setPosition(cx, cy);
            this.pageContainer.add(inner);

            // Thumbnail image
            const thumbKey = `page_thumb_${page.name}`;
            if (this.scene.textures.exists(thumbKey)) {
                const thumb = this.scene.add.image(cx, cy, thumbKey);
                // Scale to fit within the inner area
                const frame = this.scene.textures.getFrame(thumbKey);
                if (frame) {
                    const scaleX = (insetW - 8) / frame.width;
                    const scaleY = (insetH - 8) / frame.height;
                    const scale = Math.min(scaleX, scaleY);
                    thumb.setScale(scale);
                }
                this.pageContainer.add(thumb);
            }

            // Name label below card
            const label = this.scene.add.text(cx, cy + THUMB_H / 2 + 14, page.name, {
                fontSize: '22px',
                color: '#ffffff',
                fontFamily: 'Arial, sans-serif',
                fontStyle: 'bold',
                align: 'center',
            });
            label.setOrigin(0.5, 0);
            this.pageContainer.add(label);

            // Interactive hit area over the card
            card.setInteractive(
                new Phaser.Geom.Rectangle(-THUMB_W / 2, -THUMB_H / 2, THUMB_W, THUMB_H),
                Phaser.Geom.Rectangle.Contains
            );
            card.on('pointerdown', () => {
                this.onSelect(page.url);
                this.hide();
            });
            card.on('pointerover', () => {
                card.clear();
                card.fillStyle(0x6688aa, 1);
                card.fillRoundedRect(-THUMB_W / 2, -THUMB_H / 2, THUMB_W, THUMB_H, 10);
            });
            card.on('pointerout', () => {
                card.clear();
                card.fillStyle(0x555555, 1);
                card.fillRoundedRect(-THUMB_W / 2, -THUMB_H / 2, THUMB_W, THUMB_H, 10);
            });
        }

        // Update page indicator
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
        this.visible = true;
        this.container.setVisible(true);
    }

    hide(): void {
        this.visible = false;
        this.container.setVisible(false);
        if (this.focusGraphics) {
            this.focusGraphics.destroy();
            this.focusGraphics = null;
        }
    }

    get isOpen(): boolean {
        return this.visible;
    }

    private drawFocus(): void {
        if (this.cardPositions.length === 0) return;
        if (this.focusIndex >= this.cardPositions.length) {
            this.focusIndex = this.cardPositions.length - 1;
        }
        const pos = this.cardPositions[this.focusIndex];

        if (!this.focusGraphics) {
            this.focusGraphics = this.scene.add.graphics();
            this.focusGraphics.setDepth(310);
        }
        this.focusGraphics.clear();
        this.focusGraphics.lineStyle(4, 0x00ccff, 1);
        this.focusGraphics.strokeRoundedRect(
            pos.x - THUMB_W / 2 - 4,
            pos.y - THUMB_H / 2 - 4,
            THUMB_W + 8,
            THUMB_H + 8,
            12
        );
    }

    focusRight(): void {
        const col = this.focusIndex % COLS;
        if (col < COLS - 1 && this.focusIndex + 1 < this.cardPositions.length) {
            this.focusIndex++;
            this.drawFocus();
        }
    }

    focusLeft(): void {
        const col = this.focusIndex % COLS;
        if (col > 0) {
            this.focusIndex--;
            this.drawFocus();
        }
    }

    focusDown(): void {
        const next = this.focusIndex + COLS;
        if (next < this.cardPositions.length) {
            this.focusIndex = next;
            this.drawFocus();
        }
    }

    focusUp(): void {
        const prev = this.focusIndex - COLS;
        if (prev >= 0) {
            this.focusIndex = prev;
            this.drawFocus();
        }
    }

    selectFocused(): void {
        const startIdx = this.currentPage * PER_PAGE;
        const pageIdx = startIdx + this.focusIndex;
        if (pageIdx < COLORING_PAGES.length) {
            this.onSelect(COLORING_PAGES[pageIdx].url);
            this.hide();
        }
    }

    gamepadNextPage(): void {
        this.nextPage();
        this.focusIndex = 0;
        this.drawFocus();
    }

    gamepadPrevPage(): void {
        this.prevPage();
        this.focusIndex = 0;
        this.drawFocus();
    }

    showWithFocus(): void {
        this.show();
        this.focusIndex = 0;
        // Defer drawFocus to next frame so the container is visible
        this.scene.time.delayedCall(0, () => this.drawFocus());
    }
}
