import Phaser from 'phaser';

/**
 * Configuration options for creating a GridContainer.
 */
export interface GridOptions {
    scene: Phaser.Scene;
    width: number;
    height: number;
    rows: number;
    cols: number;
}

/**
 * Configuration for placing a GameObject into the grid.
 */
export interface GridItemOptions {
    col: number;
    row: number;
    colSpan?: number;
    rowSpan?: number;
    resizeToSpan?: boolean;
}