import Phaser from 'phaser';
import { WidgetOptions } from './WidgetOptions';
import { WidgetLayout } from './WidgetOptions';

type Item =
    | {
        type: 'text';
        obj: Phaser.GameObjects.Text;
        hitProp?: any;
        hitX?: number;
        hitY?: number;
        hitR?: number;
    }
    | { type: 'bar'; obj: Phaser.GameObjects.Graphics };

export class Widget {
    private scene: Phaser.Scene;
    private width: number;
    private height: number;
    private x: number;
    private y: number;
    private cornerRadius: number;
    private layout: WidgetLayout;
    private padding: number;
    private hitRadius: number;

    private container: Phaser.GameObjects.Container;
    private bg: Phaser.GameObjects.Graphics;
    private items: Item[] = [];
    private bar?: Phaser.GameObjects.Graphics;
    private progress?: number;

    // remember last drawn bar rect so setProgress can redraw without full relayout
    private lastBarRect?: { x: number; y: number; w: number; h: number };

    private constructor(opts: WidgetOptions) {
        this.scene = opts.scene;
        this.width = opts.width;
        this.height = opts.height;
        this.x = opts.x ?? 0;
        this.y = opts.y ?? 0;
        this.cornerRadius = opts.cornerRadius ?? 12;
        this.layout = opts.layout ?? 'horizontal';
        this.padding = opts.padding ?? 8;
        this.hitRadius = opts.hitRadius ?? 20;
        this.progress = opts.progress;

        this.container = this.scene.add.container(this.x, this.y);

        // background as rounded rect
        this.bg = this.scene.add.graphics();
        this.bg.fillStyle(0x111111, 0.85);
        this.bg.fillRoundedRect(0, 0, this.width, this.height, this.cornerRadius);
        this.container.add(this.bg);

        // If progress is set, add bar (bar will be placed according to insertion order)
        if (typeof this.progress === 'number') {
            this.addBar(this.progress);
        }
    }
    // Add a bar element (progress bar). Only one allowed per widget.
    addBar(progress: number) {
        if (this.bar) return this; // Only one bar allowed
        this.progress = Math.max(0, Math.min(1, progress));
        this.bar = this.scene.add.graphics();
        this.container.add(this.bar);
        // Insert bar as the next item in sequence (preserves insertion order)
        this.items.push({ type: 'bar', obj: this.bar });
        this.relayout();
        return this;
    }

    // Set progress value and redraw bar
    setProgress(progress: number) {
        if (!this.bar) return this;
        this.progress = Math.max(0, Math.min(1, progress));
        if (this.lastBarRect) {
            this.drawBarAt(this.lastBarRect.x, this.lastBarRect.y, this.lastBarRect.w, this.lastBarRect.h);
        } else {
            // fallback to full relayout if we don't have a rect
            this.relayout();
        }
        return this;
    }

    // Draw the bar at provided rect using current progress (left to right fill)
    private drawBarAt(x: number, y: number, w: number, h: number) {
        if (!this.bar || typeof this.progress !== 'number') return;
        this.lastBarRect = { x, y, w, h };
        const r = Math.min(h / 2, 6);
        this.bar.clear();
        // background bar (dark)
        this.bar.fillStyle(0x333333, 0.7);
        this.bar.fillRoundedRect(x, y, w, h, r);
        // filled portion
        const fillW = Math.floor(w * this.progress);
        if (fillW > 0) {
            this.bar.fillStyle(0x00c8ff, 0.95); // Cyan accent
            this.bar.fillRoundedRect(x, y, fillW, h, r);
        }
    }

    // Factory
    static create(opts: WidgetOptions) {
        return new Widget(opts);
    }

    // Add a text item. fontSize is numeric (px). color is CSS-like string or hex.
    // Optional hitProp will be stored and returned by checkHit when this text is the closest hit.
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
        this.items.push({ type: 'text', obj: txt, hitProp, hitR: this.hitRadius });
        this.relayout();
        return this;
    }

    // Recalculate positions of items (texts + optional bar) according to layout and current width/height
    private relayout() {
        const m = this.items.length;
        if (m === 0) return;

        if (this.layout === 'horizontal') {
            const availableW = Math.max(0, this.width - 2 * this.padding);
            const slotW = availableW / m;
            const cy = Math.floor(this.height * 0.5);
            for (let i = 0; i < m; i++) {
                const cx = this.padding + slotW * (i + 0.5);
                const item = this.items[i];
                if (item.type === 'text') {
                    item.obj.setPosition(cx, cy);
                    // store hitbox center relative to container
                    item.hitX = cx;
                    item.hitY = cy;
                    item.hitR = this.hitRadius;
                } else if (item.type === 'bar') {
                    // Bar occupies a portion of the slot, centered
                    const barW = Math.max(12, Math.floor(slotW * 0.6));
                    const barH = Math.min(16, Math.floor(this.height * 0.5));
                    const bx = Math.floor(cx - barW / 2);
                    const by = Math.floor(cy - barH / 2);
                    this.drawBarAt(bx, by, barW, barH);
                }
            }
        } else {
            // vertical layout
            const availableH = Math.max(0, this.height - 2 * this.padding);
            const slotH = availableH / m;
            const cx = Math.floor(this.width * 0.5);
            for (let i = 0; i < m; i++) {
                const cy = this.padding + slotH * (i + 0.5);
                const item = this.items[i];
                if (item.type === 'text') {
                    item.obj.setPosition(cx, cy);
                    // store hitbox center relative to container
                    item.hitX = cx;
                    item.hitY = cy;
                    item.hitR = this.hitRadius;
                } else if (item.type === 'bar') {
                    // Bar occupies a portion of the slot, centered horizontally
                    const barH = Math.max(8, Math.floor(slotH * 0.6));
                    const barW = Math.min(this.width - 2 * this.padding, Math.floor(this.width * 0.6));
                    const bx = Math.floor(cx - barW / 2);
                    const by = Math.floor(cy - barH / 2);
                    this.drawBarAt(bx, by, barW, barH);
                }
            }
        }
    }

    // Check which text item (if any) is hit by the provided scene coordinates.
    // Returns the hitProp of the closest text item within its hit radius and its center coordinates, or undefined.
    checkHit(sceneX: number, sceneY: number) {
        // convert to container-local coordinates
        const localX = sceneX - this.container.x;
        const localY = sceneY - this.container.y;
        let closest: { item: Extract<Item, { type: 'text' }>; distSq: number } | undefined;
        for (const it of this.items) {
            if (it.type !== 'text') continue;
            if (typeof it.hitX !== 'number' || typeof it.hitY !== 'number' || typeof it.hitR !== 'number') continue;
            const dx = localX - it.hitX;
            const dy = localY - it.hitY;
            const dsq = dx * dx + dy * dy;
            const r = it.hitR;
            if (dsq <= r * r) {
                if (!closest || dsq < closest.distSq) {
                    closest = { item: it, distSq: dsq };
                }
            }
        }
        return closest ? { hitProp: closest.item.hitProp, hitX: closest.item.hitX, hitY: closest.item.hitY } : undefined;
    }

    // Expose container for placing into other containers / UI grid
    getContainer() {
        return this.container;
    }

    // Convenience: set absolute position of widget after creation
    setPosition(x: number, y: number) {
        this.container.setPosition(x, y);
        return this;
    }

    // Optionally update size (will redraw background and relayout)
    setSize(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.bg.clear();
        this.bg.fillStyle(0x111111, 0.85);
        this.bg.fillRoundedRect(0, 0, this.width, this.height, this.cornerRadius);
        this.relayout();
        return this;
    }
}