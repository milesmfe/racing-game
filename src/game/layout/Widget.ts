import Phaser from 'phaser';
import { WidgetOptions, WidgetLayout } from './WidgetOptions';

type TextItem = {
    type: 'text';
    obj: Phaser.GameObjects.Text;
    hitProp?: any;
    hitX?: number;
    hitY?: number;
    hitR?: number;
};

type BarItem = { type: 'bar'; obj: Phaser.GameObjects.Graphics };

type Item = TextItem | BarItem;

/**
 * A lightweight UI widget container used to layout text labels and one optional progress bar.
 *
 * Public contract:
 * - create(opts) -> Widget
 * - addText(text, fontSize, color, hitProp?) -> this
 * - addBar(progress) -> this
 * - setProgress(progress) -> this
 * - setPosition(x,y), setSize(w,h), getContainer()
 */
export class Widget {
    private scene: Phaser.Scene;
    private width: number;
    private height: number;
    private cornerRadius: number;
    private layout: WidgetLayout;
    private padding: number;
    private hitRadius: number;

    private container: Phaser.GameObjects.Container;
    private bg: Phaser.GameObjects.Graphics;
    private items: Item[] = [];
    private bar?: Phaser.GameObjects.Graphics;
    private progress?: number;
    private lastBarRect?: { x: number; y: number; w: number; h: number };

    /**
     * Internal constructor. Use Widget.create(opts) to instantiate.
     */
    private constructor(opts: WidgetOptions) {
        this.scene = opts.scene;
        this.width = opts.width;
        this.height = opts.height;
        this.cornerRadius = opts.cornerRadius ?? 12;
        this.layout = opts.layout ?? 'horizontal';
        this.padding = opts.padding ?? 8;
        this.hitRadius = opts.hitRadius ?? 20;
        this.progress = opts.progress;

        this.container = this.scene.add.container(opts.x ?? 0, opts.y ?? 0);

        this.bg = this.scene.add.graphics();
        this.drawBackground();
        this.container.add(this.bg);

        if (typeof this.progress === 'number') {
            this.addBar(this.progress);
        }
    }

    /**
     * Add a progress bar. Only a single bar is supported.
     */
    addBar(progress: number) {
        if (this.bar) return this;
        this.progress = clamp01(progress);
        this.bar = this.scene.add.graphics();
        this.container.add(this.bar);
        this.items.push({ type: 'bar', obj: this.bar });
        this.relayout();
        return this;
    }

    /**
     * Update progress (0..1) and redraw the bar efficiently.
     */
    setProgress(progress: number) {
        if (!this.bar) return this;
        this.progress = clamp01(progress);
        if (this.lastBarRect) {
            this.drawBarAt(this.lastBarRect.x, this.lastBarRect.y, this.lastBarRect.w, this.lastBarRect.h);
        } else {
            this.relayout();
        }
        return this;
    }

    /**
     * Factory method.
     */
    static create(opts: WidgetOptions) {
        return new Widget(opts);
    }

    /**
     * Add a centered text label to the widget. color may be a CSS string or numeric hex.
     */
    addText(text: string, fontSize: number, color: string | number, hitProp?: any) {
        const style: Phaser.Types.GameObjects.Text.TextStyle = {
            fontSize: `${fontSize}px`,
            color: typeof color === 'number' ? undefined : String(color),
        };
        const txt = this.scene.add.text(0, 0, text, style).setOrigin(0.5);
        if (typeof color === 'number') {
            const hex = `#${color.toString(16).padStart(6, '0')}`;
            txt.setColor(hex);
        }
        this.container.add(txt);
        const item: TextItem = { type: 'text', obj: txt, hitProp, hitR: this.hitRadius };
        this.items.push(item);
        this.relayout();
        return this;
    }

    /**
     * Recalculate layout for all items. Text items get centered positions and their hit centers are stored.
     */
    private relayout() {
        const count = this.items.length;
        if (count === 0) return;

        if (this.layout === 'horizontal') {
            this.relayoutHorizontal(count);
        } else {
            this.relayoutVertical(count);
        }
    }

    private relayoutHorizontal(count: number) {
        const availableW = Math.max(0, this.width - 2 * this.padding);
        const slotW = availableW / count;
        const cy = Math.floor(this.height * 0.5);

        for (let i = 0; i < count; i++) {
            const cx = this.padding + slotW * (i + 0.5);
            const it = this.items[i];
            if (it.type === 'text') {
                placeTextAt(it, cx, cy, this.hitRadius);
            } else {
                const barW = Math.max(12, Math.floor(slotW * 0.6));
                const barH = Math.min(16, Math.floor(this.height * 0.5));
                const bx = Math.floor(cx - barW / 2);
                const by = Math.floor(cy - barH / 2);
                this.drawBarAt(bx, by, barW, barH);
            }
        }
    }

    private relayoutVertical(count: number) {
        const availableH = Math.max(0, this.height - 2 * this.padding);
        const slotH = availableH / count;
        const cx = Math.floor(this.width * 0.5);

        for (let i = 0; i < count; i++) {
            const cy = this.padding + slotH * (i + 0.5);
            const it = this.items[i];
            if (it.type === 'text') {
                placeTextAt(it, cx, cy, this.hitRadius);
            } else {
                const barH = Math.max(8, Math.floor(slotH * 0.6));
                const barW = Math.min(this.width - 2 * this.padding, Math.floor(this.width * 0.6));
                const bx = Math.floor(cx - barW / 2);
                const by = Math.floor(cy - barH / 2);
                this.drawBarAt(bx, by, barW, barH);
            }
        }
    }

    /**
     * Draws the progress bar at the given rectangle using the current progress value.
     */
    private drawBarAt(x: number, y: number, w: number, h: number) {
        if (!this.bar || typeof this.progress !== 'number') return;
        this.lastBarRect = { x, y, w, h };
        const r = Math.min(h / 2, 6);
        this.bar.clear();
        this.bar.fillStyle(0x333333, 0.7);
        this.bar.fillRoundedRect(x, y, w, h, r);
        const fillW = Math.floor(w * this.progress);
        if (fillW > 0) {
            this.bar.fillStyle(0x00c8ff, 0.95);
            this.bar.fillRoundedRect(x, y, fillW, h, r);
        }
    }

    /**
     * Return hit info for a given scene coordinate. If multiple text items overlap, the closest is returned.
     */
    checkHit(sceneX: number, sceneY: number) {
        const localX = sceneX - this.container.x;
        const localY = sceneY - this.container.y;
        let closest: { item: TextItem; distSq: number } | undefined;

        for (const it of this.items) {
            if (it.type !== 'text') continue;
            if (typeof it.hitX !== 'number' || typeof it.hitY !== 'number' || typeof it.hitR !== 'number') continue;
            const dx = localX - it.hitX;
            const dy = localY - it.hitY;
            const dsq = dx * dx + dy * dy;
            const r = it.hitR;
            if (dsq <= r * r && (!closest || dsq < closest.distSq)) {
                closest = { item: it, distSq: dsq };
            }
        }

        return closest ? { hitProp: closest.item.hitProp, hitX: closest.item.hitX, hitY: closest.item.hitY } : undefined;
    }

    /**
     * Expose the internal container so the widget can be composed into other UI structures.
     */
    getContainer() {
        return this.container;
    }

    /**
     * Set absolute position of the widget.
     */
    setPosition(x: number, y: number) {
        this.container.setPosition(x, y);
        return this;
    }

    /**
     * Update widget size and redraw background/layout.
     */
    setSize(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.drawBackground();
        this.relayout();
        return this;
    }

    private drawBackground() {
        this.bg.clear();
        this.bg.fillStyle(0x111111, 0.85);
        this.bg.fillRoundedRect(0, 0, this.width, this.height, this.cornerRadius);
    }
}

/** Helper: clamp value to [0,1] */
function clamp01(v: number) {
    return Math.max(0, Math.min(1, v));
}

/** Helper: position a text item and set its hit center and radius. */
function placeTextAt(it: TextItem, x: number, y: number, hitRadius: number) {
    it.obj.setPosition(x, y);
    it.hitX = x;
    it.hitY = y;
    it.hitR = hitRadius;
}
