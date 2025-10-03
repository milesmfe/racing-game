import Phaser from 'phaser';
import { Item } from './Item';

/**
 * Interface for ProgressBarItem constructor options.
 */
export interface ProgressBarOptions {
    scene: Phaser.Scene;
    width: number;
    height: number;
    color?: number;
    backgroundColor?: number;
    initialProgress?: number;
}

/**
 * Progress bar item for use in Widgets.
 */
export class ProgressBarItem extends Item {
    private container: Phaser.GameObjects.Container;
    private background: Phaser.GameObjects.Graphics;
    private bar: Phaser.GameObjects.Graphics;
    private barWidth: number;
    private barHeight: number;
    private barColor: number;
    private progress: number;

    constructor(options: ProgressBarOptions) {
        const { scene, width, height, color, backgroundColor, initialProgress } = options;

        const container = scene.add.container(0, 0);
        super(container);

        this.container = container;
        this.background = scene.add.graphics();
        this.bar = scene.add.graphics();

        this.container.add([this.background, this.bar]);

        this.barWidth = width;
        this.barHeight = height;
        this.barColor = color ?? 0x00ff00; // Default to green
        this.progress = 0;

        // Draw the background, centered in the container
        this.background.fillStyle(backgroundColor ?? 0x444444); // Default to dark grey
        this.background.fillRect(-this.barWidth / 2, -this.barHeight / 2, this.barWidth, this.barHeight);

        // Set initial progress
        this.setProgress(initialProgress ?? 0);
    }

    /**
     * Get the underlying Phaser container.
     */
    getObject(): Phaser.GameObjects.Container {
        return this.container;
    }

    /**
     * Set the position of this item. The widget's layout manager uses this.
     */
    setPosition(x: number, y: number): void {
        this.container.setPosition(x, y);
    }

    /**
     * Get the current position of this item.
     */
    getPosition(): { x: number; y: number } {
        return { x: this.container.x, y: this.container.y };
    }

    /**
     * Get the width of this item.
     */
    getWidth(): number {
        return this.barWidth;
    }

    /**
     * Get the height of this item.
     */
    getHeight(): number {
        return this.barHeight;
    }

    /**
     * Update the progress of the bar. This is the update hook.
     * @param progress A value between 0 and 1.
     */
    setProgress(progress: number): void {
        // Clamp progress value between 0 and 1
        this.progress = Math.max(0, Math.min(1, progress));
        this.redrawBar();
    }

    /**
     * Get the current progress of the bar.
     * @returns A value between 0 and 1.
     */
    getProgress(): number {
        return this.progress;
    }

    /**
     * Redraws the progress bar fill based on the current progress.
     */
    private redrawBar(): void {
        this.bar.clear();
        this.bar.fillStyle(this.barColor);
        const currentWidth = this.barWidth * this.progress;
        // Draw from the left edge of the centered container
        this.bar.fillRect(-this.barWidth / 2, -this.barHeight / 2, currentWidth, this.barHeight);
    }
}