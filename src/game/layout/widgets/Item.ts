import Phaser from 'phaser';

/**
 * Abstract base class for all widget items.
 * Defines the interface that all items must implement.
 */
export abstract class Item {
    protected object: Phaser.GameObjects.GameObject;

    constructor(object: Phaser.GameObjects.GameObject) {
        this.object = object;
    }

    /**
     * Get the underlying Phaser game object.
     */
    abstract getObject(): Phaser.GameObjects.GameObject;

    /**
     * Set the position of this item.
     */
    abstract setPosition(x: number, y: number): void;

    /**
     * Get the current position of this item.
     */
    abstract getPosition(): { x: number; y: number };

    /**
     * Get the width of this item.
     */
    abstract getWidth(): number;

    /**
     * Get the height of this item.
     */
    abstract getHeight(): number;
}
