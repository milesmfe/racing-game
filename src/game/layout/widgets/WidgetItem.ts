import Phaser from 'phaser';
import { Item } from './Item';
import { Widget } from './Widget';

/**
 * Widget item wrapper - allows nesting widgets within widgets.
 */
export class WidgetItem extends Item {
    private widget: Widget;

    constructor(widget: Widget) {
        super(widget.getContainer());
        this.widget = widget;
    }

    getObject(): Phaser.GameObjects.Container {
        return this.widget.getContainer();
    }

    setPosition(x: number, y: number): void {
        const width = this.getWidth();
        const height = this.getHeight();
        this.widget.setPosition(x - width / 2, y - height / 2);
    }

    getPosition(): { x: number; y: number } {
        const container = this.widget.getContainer();
        return { x: container.x, y: container.y };
    }

    getWidth(): number {
        return this.widget.getWidth();
    }

    getHeight(): number {
        return this.widget.getHeight();
    }

    /**
     * Get the nested widget instance.
     */
    getWidget(): Widget {
        return this.widget;
    }
}
