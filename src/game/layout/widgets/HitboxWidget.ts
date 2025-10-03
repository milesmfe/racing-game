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
 * Widget with hit detection capabilities. Can detect which item is closest
 * to given coordinates, recursively checking nested widgets.
 */
export class HitboxWidget extends Widget {
    private hitRadius: number;

    constructor(options: WidgetOptions & { hitRadius?: number }) {
        super(options);
        this.hitRadius = options.hitRadius ?? 20;
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
        // Handle nested widgets recursively
        if (item instanceof WidgetItem) {
            const nestedWidget = item.getWidget();
            
            // If it's a HitboxWidget, use its hit detection
            if (nestedWidget instanceof HitboxWidget) {
                const position = item.getPosition();
                const nestedLocalX = localX - position.x;
                const nestedLocalY = localY - position.y;
                
                return nestedWidget.checkHitLocal(nestedLocalX, nestedLocalY);
            }
        }

        // Calculate distance to item center
        const position = item.getPosition();
        const dx = localX - position.x;
        const dy = localY - position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if within hit radius
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

    /**
     * Set the hit detection radius.
     */
    setHitRadius(radius: number): this {
        this.hitRadius = radius;
        return this;
    }

    /**
     * Get the hit detection radius.
     */
    getHitRadius(): number {
        return this.hitRadius;
    }
}
