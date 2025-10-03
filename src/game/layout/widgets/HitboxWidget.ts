import { Widget } from './Widget';
import { Item } from './Item';
import { WidgetItem } from './WidgetItem';
import { TextItem } from './TextItem';
import { ImageItem } from './ImageItem';
import { ProgressBarItem, ProgressBarOptions } from './ProgressBarItem';
import { WidgetOptions } from './types';

export interface HitResult {
    item: Item;
    distance: number;
    localX: number;
    localY: number;
}

/**
 * An interactive widget that can handle pointer events.
 * Extends the base Widget with click handling and an enabled/disabled state.
 */
export class HitboxWidget extends Widget {
    private hitRadius: number;
    private itemClickHandlers: Map<Item, () => void>;
    private widgetClickHandler: (() => void) | undefined;

    constructor(options: WidgetOptions & { hitRadius?: number }) {
        super(options);
        this.hitRadius = options.hitRadius ?? 20;
        this.itemClickHandlers = new Map();

        const hitArea = new Phaser.Geom.Rectangle(0, 0, this.width, this.height);
        this.background
            .setInteractive({
                hitArea: hitArea,
                hitAreaCallback: Phaser.Geom.Rectangle.Contains,
                useHandCursor: true,
            })
            // Use the localX and localY provided by the event, which are relative to the background object
            .on('pointerdown', (_: Phaser.Input.Pointer, localX: number, localY: number) => {
                const hit = this.checkHitLocal(localX, localY);
                if (hit) {
                    const handler = this.itemClickHandlers.get(hit.item);
                    if (handler) {
                        handler();
                        return; // Item-specific click handled, so we stop here.
                    }
                }

                // If no item was hit (or the hit item had no handler), call the generic widget handler.
                if (this.widgetClickHandler) {
                    this.widgetClickHandler();
                }
            });
    }

    /**
     * Add an item to the widget, with an optional onClick handler.
     */
    addItem(item: Item, onClick?: () => void): Item {
        super.addItem(item);
        if (onClick) {
            this.itemClickHandlers.set(item, onClick);
        }
        return item;
    }

    /**
     * Convenience method: Add a text item to the widget.
     */
    addText(text: string, fontSize: number, color: string | number, onClick?: () => void): TextItem {
        return this.addItem(new TextItem(this.scene, text, fontSize, color), onClick) as TextItem;
    }

    /**
     * Convenience method: Add an image item to the widget.
     */
    addImage(texture: string, scale?: number, frame?: string | number, onClick?: () => void): ImageItem {
        return this.addItem(new ImageItem(this.scene, texture, scale, frame), onClick) as ImageItem;
    }

    /**
     * Convenience method: Add a nested widget as an item.
     */
    addWidget(widget: Widget, onClick?: () => void): WidgetItem {
        return this.addItem(new WidgetItem(widget), onClick) as WidgetItem;
    }

    /**
     * Convenience method: Add a progress bar item to the widget.
     * * @param initialProgress - A value from 0 to 1 for the bar's initial progress.
     */
    addProgressBar(initialProgress?: number, onClick?: () => void): ProgressBarItem;

    /**
     * Convenience method: Add a progress bar item to the widget.
     * * @param options - A configuration object to customize the progress bar.
     */
    addProgressBar(options: Partial<Omit<ProgressBarOptions, 'scene'>>, onClick?: () => void): ProgressBarItem;

    /**
     * Implementation of the overloaded addProgressBar method.
     */
    addProgressBar(
        optionsOrProgress?: number | Partial<Omit<ProgressBarOptions, 'scene'>>,
        onClick?: () => void
    ): ProgressBarItem {
        let options: Partial<Omit<ProgressBarOptions, 'scene'>>;

        if (typeof optionsOrProgress === 'number' || typeof optionsOrProgress === 'undefined') {
            options = { initialProgress: optionsOrProgress };
        } else {
            options = optionsOrProgress;
        }

        const defaultOptions = {
            width: this.width - this.padding * 2,
            height: 16,
        };

        const finalOptions: ProgressBarOptions = {
            scene: this.scene,
            ...defaultOptions,
            ...options,
        };

        return this.addItem(new ProgressBarItem(finalOptions), onClick) as ProgressBarItem;
    }

    /**
     * Assigns a callback to be executed when the widget is clicked (and no specific item was clicked).
     */
    public onClick(callback: () => void): this {
        this.widgetClickHandler = callback;
        return this;
    }

    /**
     * Remove an item from the widget.
     */
    removeItem(item: Item): void {
        super.removeItem(item);
        this.itemClickHandlers.delete(item);
    }

    /**
    * Removes all items from the widget.
    */
    public removeAllItems(): void {
        super.removeAllItems();
        this.itemClickHandlers.clear();
    }

    /**
     * Enable or disable interactivity for the widget.
     * Visually updates the alpha to reflect the state.
     */
    public setEnabled(enabled: boolean): this {
        if (this.background.input) {
            this.background.input.enabled = enabled;
        }
        this.container.setAlpha(enabled ? 1 : 0.5);
        return this;
    }

    /**
     * Find the closest item to local coordinates (relative to this widget).
     */
    private checkHitLocal(localX: number, localY: number): HitResult | undefined {
        let closestResult: HitResult | undefined;

        for (const item of this.items) {
            const result = this.checkItemHit(item, localX, localY);

            if (result && (!closestResult || result.distance < closestResult.distance)) {
                closestResult = result;
            }
        }

        return closestResult;
    }

    /**
     * Check hit for a single item. Recursively checks nested widgets.
     */
    private checkItemHit(item: Item, localX: number, localY: number): HitResult | undefined {
        if (item instanceof WidgetItem) {
            const nestedWidget = item.getWidget();
            if (nestedWidget instanceof HitboxWidget) {
                const position = item.getPosition();
                const nestedLocalX = localX - position.x;
                const nestedLocalY = localY - position.y;
                return nestedWidget.checkHitLocal(nestedLocalX, nestedLocalY);
            }
        }

        const position = item.getPosition();
        const dx = localX - position.x;
        const dy = localY - position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= this.hitRadius) {
            return {
                item,
                distance,
                localX: position.x,
                localY: position.y,
            };
        }

        return undefined;
    }
}