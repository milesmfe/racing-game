import { Widget } from './Widget';
import { Item } from './Item';
import { WidgetItem } from './WidgetItem';
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

    constructor(options: WidgetOptions & { hitRadius?: number }) {
        super(options);
        this.hitRadius = options.hitRadius ?? 20;
    }

    /**
     * Assigns a callback to be executed when the widget is clicked.
     * This method also makes the widget's background interactive.
     */
    public onClick(callback: () => void): this {
        const hitArea = new Phaser.Geom.Rectangle(0, 0, this.width, this.height);
        this.background
            .setInteractive({
                hitArea: hitArea,
                hitAreaCallback: Phaser.Geom.Rectangle.Contains,
                useHandCursor: true,
            })
            .on('pointerdown', callback);

        return this;
    }

    /**
     * Enable or disable interactivity for the widget.
     * Visually updates the alpha to reflect the state.
     */
    public setEnabled(enabled: boolean): this {
        // Ensure the input component has been created by an onClick call first.
        if (!this.background.input) {
            return this;
        }

        this.background.input.enabled = enabled;
        this.container.setAlpha(enabled ? 1 : 0.5);
        return this;
    }

    /**
     * Find the closest item to the given scene coordinates.
     * Recursively searches nested widgets.
     */
    checkHit(sceneX: number, sceneY: number): HitResult | undefined {
        const localX = sceneX - this.container.x;
        const localY = sceneY - this.container.y;

        return this.checkHitLocal(localX, localY);
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