import Phaser from 'phaser';
import { Item } from './Item';
import { TextItem } from './TextItem';
import { ImageItem } from './ImageItem';
import { WidgetItem } from './WidgetItem';
import { ProgressBarItem, ProgressBarOptions } from './ProgressBarItem';
import { WidgetOptions, WidgetLayout } from './types';

/**
 * A lightweight UI widget container that layouts items (text, images, nested widgets)
 * in a rounded rectangle background.
 */
export class Widget {
    protected scene: Phaser.Scene;
    protected width: number;
    protected height: number;
    protected cornerRadius: number;
    protected layout: WidgetLayout;
    protected padding: number;
    protected backgroundColor: number;
    protected backgroundAlpha: number;

    protected container: Phaser.GameObjects.Container;
    protected background: Phaser.GameObjects.Graphics;
    protected items: Item[];

    constructor(options: WidgetOptions) {
        this.scene = options.scene;
        this.width = options.width;
        this.height = options.height;
        this.cornerRadius = options.cornerRadius ?? 12;
        this.layout = options.layout ?? 'horizontal';
        this.padding = options.padding ?? 8;
        this.backgroundColor = options.backgroundColor ?? 0x111111;
        this.backgroundAlpha = options.backgroundAlpha ?? 0.85;
        this.items = [];

        this.container = this.scene.add.container(options.x ?? 0, options.y ?? 0);
        this.background = this.scene.add.graphics();
        this.container.add(this.background);

        this.drawBackground();
    }

    /**
     * Add an item to the widget. This is the core method that all specific add methods use.
     */
    addItem(item: Item): Item {
        this.container.add(item.getObject());
        this.items.push(item);
        this.relayout();
        return item;
    }

    /**
     * Convenience method: Add a text item to the widget.
     */
    addText(text: string, fontSize: number, color: string | number): TextItem {
        return this.addItem(new TextItem(this.scene, text, fontSize, color)) as TextItem;
    }

    /**
     * Convenience method: Add an image item to the widget.
     */
    addImage(texture: string, frame?: string | number): ImageItem {
        return this.addItem(new ImageItem(this.scene, texture, frame)) as ImageItem;
    }

    /**
     * Convenience method: Add a nested widget as an item.
     */
    addWidget(widget: Widget): WidgetItem {
        return this.addItem(new WidgetItem(widget)) as WidgetItem;
    }

    /**
     * Convenience method: Add a progress bar item to the widget.
     * * @param initialProgress - A value from 0 to 1 for the bar's initial progress.
     */
    addProgressBar(initialProgress?: number): ProgressBarItem;

    /**
     * Convenience method: Add a progress bar item to the widget.
     * * @param options - A configuration object to customize the progress bar.
     */
    addProgressBar(options: Partial<Omit<ProgressBarOptions, 'scene'>>): ProgressBarItem;

    /**
     * Implementation of the overloaded addProgressBar method.
     */
    addProgressBar(
        optionsOrProgress?: number | Partial<Omit<ProgressBarOptions, 'scene'>>
    ): ProgressBarItem {
        let options: Partial<Omit<ProgressBarOptions, 'scene'>>;

        // Check if the user passed a simple number for progress or a full options object.
        if (typeof optionsOrProgress === 'number' || typeof optionsOrProgress === 'undefined') {
            options = { initialProgress: optionsOrProgress };
        } else {
            options = optionsOrProgress;
        }

        // Define sensible defaults. The bar's width is based on the widget's width minus padding.
        const defaultOptions = {
            width: this.width - this.padding * 2,
            height: 16, // A reasonable default height in pixels.
        };

        const finalOptions: ProgressBarOptions = {
            scene: this.scene,
            ...defaultOptions,
            ...options, // User options will override defaults.
        };

        return this.addItem(new ProgressBarItem(finalOptions)) as ProgressBarItem;
    }

    /**
     * Remove an item from the widget.
     */
    removeItem(item: Item): void {
        const index = this.items.indexOf(item);
        if (index !== -1) {
            this.items.splice(index, 1);
            this.container.remove(item.getObject());
            this.relayout();
        }
    }

    /**
     * Get all items in the widget.
     */
    getItems(): readonly Item[] {
        return this.items;
    }

    /**
     * Relayout all items based on current layout mode.
     */
    protected relayout(): void {
        if (this.items.length === 0) return;

        if (this.layout === 'horizontal') {
            this.relayoutHorizontal();
        } else {
            this.relayoutVertical();
        }
    }

    /**
     * Layout items horizontally with equal spacing.
     */
    protected relayoutHorizontal(): void {
        const count = this.items.length;
        const availableWidth = Math.max(0, this.width - 2 * this.padding);
        const slotWidth = availableWidth / count;
        const centerY = this.height * 0.5;

        for (let i = 0; i < count; i++) {
            const centerX = this.padding + slotWidth * (i + 0.5);
            this.items[i].setPosition(centerX, centerY);
        }
    }

    /**
     * Layout items vertically with equal spacing.
     */
    protected relayoutVertical(): void {
        const count = this.items.length;
        const availableHeight = Math.max(0, this.height - 2 * this.padding);
        const slotHeight = availableHeight / count;
        const centerX = this.width * 0.5;

        for (let i = 0; i < count; i++) {
            const centerY = this.padding + slotHeight * (i + 0.5);
            this.items[i].setPosition(centerX, centerY);
        }
    }

    /**
     * Redraw the background.
     */
    protected drawBackground(): void {
        this.background.clear();
        this.background.fillStyle(this.backgroundColor, this.backgroundAlpha);
        this.background.fillRoundedRect(0, 0, this.width, this.height, this.cornerRadius);
    }

    /**
     * Get the internal container.
     */
    getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    /**
     * Set widget position.
     */
    setPosition(x: number, y: number): this {
        this.container.setPosition(x, y);
        return this;
    }

    /**
     * Set widget size and redraw.
     */
    setSize(width: number, height: number): this {
        this.width = width;
        this.height = height;
        this.drawBackground();
        this.relayout();
        return this;
    }

    /**
     * Get widget width.
     */
    getWidth(): number {
        return this.width;
    }

    /**
     * Get widget height.
     */
    getHeight(): number {
        return this.height;
    }

    /**
     * Set layout mode.
     */
    setLayout(layout: WidgetLayout): this {
        this.layout = layout;
        this.relayout();
        return this;
    }

    /**
     * Destroy the widget and all its contents.
     */
    destroy(): void {
        this.container.destroy();
    }
}
