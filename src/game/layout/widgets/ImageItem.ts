import Phaser from 'phaser';
import { Item } from './Item';

/**
 * Image item wrapper for Phaser image objects.
 */
export class ImageItem extends Item {
    private image: Phaser.GameObjects.Image;

    constructor(scene: Phaser.Scene, texture: string, scale?: number, frame?: string | number) {
        const image = scene.add.image(0, 0, texture, frame).setOrigin(0.5);
        if (scale) {
            image.setScale(scale);
        }
        super(image);
        this.image = image;
    }

    getObject(): Phaser.GameObjects.Image {
        return this.image;
    }

    setPosition(x: number, y: number): void {
        this.image.setPosition(x, y);
    }

    getPosition(): { x: number; y: number } {
        return { x: this.image.x, y: this.image.y };
    }

    getWidth(): number {
        return this.image.width * this.image.scaleX;
    }

    getHeight(): number {
        return this.image.height * this.image.scaleY;
    }

    /**
     * Set the scale of the image.
     */
    setScale(scale: number): void {
        this.image.setScale(scale);
    }
}
