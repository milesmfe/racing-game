import Phaser from 'phaser';
import { Item } from './Item';

/**
 * Text item wrapper for Phaser text objects.
 */
export class TextItem extends Item {
    private text: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, text: string, fontSize: number, color: string | number) {
        const style: Phaser.Types.GameObjects.Text.TextStyle = {
            fontSize: `${fontSize}px`,
            color: typeof color === 'number' ? `#${color.toString(16).padStart(6, '0')}` : color,
        };
        const textObj = scene.add.text(0, 0, text, style).setOrigin(0.5);
        super(textObj);
        this.text = textObj;
    }

    getObject(): Phaser.GameObjects.Text {
        return this.text;
    }

    setPosition(x: number, y: number): void {
        this.text.setPosition(x, y);
    }

    getPosition(): { x: number; y: number } {
        return { x: this.text.x, y: this.text.y };
    }

    getWidth(): number {
        return this.text.width;
    }

    getHeight(): number {
        return this.text.height;
    }

    /**
     * Update the text content.
     */
    setText(text: string): void {
        this.text.setText(text);
    }
}
