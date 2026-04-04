# UI Juice & Animations Design

## Context

The kids drawing game has zero animations — every UI interaction (tool select, color select, modals, clear, undo/redo) is an instant state change. This makes the app feel flat and unresponsive for a kids audience. We're adding "juice" — bouncy, kid-friendly animations using Phaser 4's tween system to make every interaction feel satisfying and alive.

**Approach:** Tween-only (no particles). All animations use Phaser's built-in `scene.tweens.add()` with bouncy/elastic easings. No new dependencies, no new assets.

**Target feel:** Kid-friendly fun — bouncy, elastic easings, playful scale pops, staggered entrances.

---

## 1. Button Press Feedback (UIButton.ts)

**Current:** Instant `setScale(0.95)` on pointerdown, instant `setScale(1)` on release.

**New:** Animated press/release with bouncy recovery.
- **pointerdown:** Tween scale to 0.9 over 80ms with `Quad.easeOut`
- **pointerup/pointerout:** Tween scale to 1.0 over 250ms with `Back.easeOut` (overshoot bounce)
- Kill any existing scale tween before starting a new one to prevent conflicts

**Files:** `src/game/ui/UIButton.ts`

---

## 2. Tool Selection (ToolSelector.ts)

**Current:** Instant border highlight swap via `setHighlight()`.

**New:** Selected tool gets a pop-scale animation.
- On select: tween the newly selected button scale 1 -> 1.15 -> 1.0 (150ms up, 200ms settle) with `Back.easeOut`
- The deselected button just redraws normally (no animation needed for deselection)

**Files:** `src/game/ui/ToolSelector.ts`

---

## 3. Color Swatch Selection (ColorPalette.ts)

**Current:** Instant border redraw on selected swatch.

**New:** Scale animation on selection.
- **Selected swatch:** Tween scale to 1.25 over 150ms with `Back.easeOut`, then settle to 1.15 (stays slightly enlarged while selected)
- **Deselected swatch:** Tween scale back to 1.0 over 200ms with `Quad.easeOut`
- Since swatches are `Graphics` objects, we can tween their `scaleX`/`scaleY` directly

**Files:** `src/game/ui/ColorPalette.ts`

---

## 4. Color Wheel Overlay (ColorPalette.ts)

**Current:** Instant create/destroy of overlay container.

**New:** Animated open and close.
- **Open:** Set initial alpha=0, scale=0.85. Tween to alpha=1, scale=1.0 over 250ms with `Back.easeOut`. Backdrop fades alpha 0->1 over 200ms.
- **Close:** Tween alpha=1->0, scale=1.0->0.85 over 150ms with `Quad.easeIn`. Destroy container in `onComplete`. Backdrop fades out over 150ms.
- Separate the backdrop into its own tween target so it fades independently from the panel

**Implementation note:** The panel content (wheel, strip) should be in a sub-container separate from the backdrop so we can scale the panel without scaling the backdrop.

**Files:** `src/game/ui/ColorPalette.ts`

---

## 5. Coloring Page Selector Modal (ColoringPageSelector.ts)

**Current:** Instant `setVisible(true/false)`.

**New:** Animated open/close + staggered card entrance.
- **Open:**
  - Backdrop fades in (alpha 0->1 over 200ms)
  - Panel scales from 0.9 to 1.0 with `Back.easeOut` over 300ms, alpha 0->1
  - Cards stagger in: each card starts at alpha=0, y offset +20px, then tweens to alpha=1, y=0 over 200ms with 40ms delay between each card. Use `Quad.easeOut`.
- **Close:**
  - Panel + cards tween alpha->0, scale->0.95 over 150ms with `Quad.easeIn`
  - Backdrop fades out over 150ms
  - `setVisible(false)` in `onComplete`
- **Page card hover:** Tween scale to 1.04 over 120ms with `Quad.easeOut` on pointerover, tween back to 1.0 on pointerout

**Implementation note:** Need to restructure slightly — put the panel + content in a sub-container (separate from backdrop) so we can scale/fade the panel independently. Cards need individual containers (wrapping card bg + inner + thumb + label) for independent animation.

**Files:** `src/game/ui/ColoringPageSelector.ts`

---

## 6. Clear Canvas Flash (DrawingScene.ts)

**Current:** Instant fill with white.

**New:** Brief white flash overlay.
- Create a white rectangle overlay at depth 150 (above canvas, below toolbar)
- Set alpha to 0.7, then tween to 0 over 300ms with `Quad.easeOut`
- Destroy the overlay on complete
- The actual canvas clear happens immediately (same frame)

**Files:** `src/game/scenes/DrawingScene.ts`

---

## 7. Undo/Redo Button Pulse (DrawingScene.ts)

**Current:** Instant state restore with no visual feedback.

**New:** Quick pulse on the canvas.
- Create a subtle white overlay (alpha 0.15) covering the canvas area
- Fade to 0 over 200ms with `Quad.easeOut`
- Much subtler than clear flash — just a "something changed" signal

**Files:** `src/game/scenes/DrawingScene.ts`

---

## 8. Toolbar Entrance (Toolbar.ts + DrawingScene.ts)

**Current:** Toolbar appears instantly on scene create.

**New:** Toolbar slides up from bottom on scene start.
- Set toolbar container y to `1080` (fully off-screen, since normal Y is 960)
- Tween y to 960 over 400ms with `Back.easeOut` (slight overshoot)
- Tool buttons stagger in from left: each with 50ms delay, alpha 0->1 and x offset -20->0 over 200ms

**Files:** `src/game/ui/Toolbar.ts`

---

## Animation Timing Summary

| Animation | Duration | Easing | Trigger |
|-----------|----------|--------|---------|
| Button press | 80ms | Quad.easeOut | pointerdown |
| Button release | 250ms | Back.easeOut | pointerup/out |
| Tool select pop | 350ms total | Back.easeOut | tool change |
| Color swatch select | 150ms | Back.easeOut | color change |
| Color swatch deselect | 200ms | Quad.easeOut | color change |
| Wheel overlay open | 250ms | Back.easeOut | wheel click |
| Wheel overlay close | 150ms | Quad.easeIn | backdrop click/color pick |
| Page modal open | 300ms panel + stagger | Back.easeOut | pages btn |
| Page modal close | 150ms | Quad.easeIn | backdrop/card click |
| Page card hover | 120ms | Quad.easeOut | pointerover |
| Clear flash | 300ms | Quad.easeOut | clear btn |
| Undo/redo pulse | 200ms | Quad.easeOut | undo/redo |
| Toolbar entrance | 400ms + stagger | Back.easeOut | scene start |

---

## Verification Plan

1. Run `npm run dev` and test each interaction:
   - Click each tool button — should see bouncy press and selection pop
   - Click color swatches — should see scale animation on select/deselect
   - Open/close color wheel — should fade+scale in/out
   - Open/close page selector — should see backdrop fade, panel scale, cards stagger
   - Hover page cards — should see gentle scale up
   - Click clear — should see white flash
   - Click undo/redo — should see subtle pulse
   - On initial load — toolbar slides up, buttons stagger in
2. Verify no animation conflicts (rapid clicking shouldn't cause visual glitches)
3. Test on Steam Deck resolution (1280x800) to ensure animations feel right
4. Confirm drawing still works correctly (animations don't interfere with canvas input)
