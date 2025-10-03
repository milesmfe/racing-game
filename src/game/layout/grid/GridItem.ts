import Phaser from 'phaser';
import { GridItemOptions } from './GridTypes';

/**
 * A wrapper for a GameObject placed within a GridContainer.
 * It holds the object and its associated grid layout properties.
 */
export class GridItem {
    public readonly gameObject: Phaser.GameObjects.GameObject;
    public col: number;
    public row: number;
    public colSpan: number;
    public rowSpan: number;
    public resizeToSpan: boolean;

    constructor(gameObject: Phaser.GameObjects.GameObject, options: GridItemOptions) {
        this.gameObject = gameObject;
        this.col = options.col;
        this.row = options.row;
        this.colSpan = options.colSpan ?? 1;
        this.rowSpan = options.rowSpan ?? 1;
        this.resizeToSpan = options.resizeToSpan ?? false;
    }
}