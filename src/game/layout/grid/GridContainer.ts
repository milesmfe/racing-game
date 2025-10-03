import Phaser from 'phaser';
import { GridOptions, GridItemOptions } from './GridTypes';
import { GridItem } from './GridItem';

/**
 * GridContainer is a container that manages and positions GameObjects in a grid layout.
 * It follows OOP principles by separating the container logic from the item data.
 */
export class GridContainer extends Phaser.GameObjects.Container {
    public readonly rows: number;
    public readonly cols: number;
    private items: GridItem[] = [];

    constructor(options: GridOptions) {
        super(options.scene, 0, 0);
        this.width = options.width;
        this.height = options.height;
        this.rows = options.rows;
        this.cols = options.cols;
        this.setSize(this.width, this.height);
    }

    /**
     * Adds a GameObject to the grid with specified layout options.
     */
    public addItem(gameObject: Phaser.GameObjects.GameObject, options: GridItemOptions): GridItem {
        super.add(gameObject);

        const gridItem = new GridItem(gameObject, options);
        this.items.push(gridItem);
        this.relayout();

        return gridItem;
    }

    /**
     * Re-calculates the position and size of all items in the grid.
     */
    public relayout(): void {
        for (const item of this.items) {
            this.positionItem(item);
        }
    }

    /**
     * Positions a single GridItem according to its properties.
     */
    protected positionItem(item: GridItem): void {
        const { gameObject, col, row, colSpan, rowSpan, resizeToSpan } = item;
        const bounds = this.cellBounds(col, row, colSpan, rowSpan);
        const anyGo: any = gameObject;

        if (resizeToSpan) {
            this.tryResize(anyGo, bounds.width, bounds.height);
        }

        if (colSpan > 1 || rowSpan > 1) {
            // For spanned items, align to the top-left of the spanned region.
            this.trySetOriginTopLeft(anyGo);
            anyGo.x = bounds.x;
            anyGo.y = bounds.y;
        } else {
            // For single-cell items, center them within the cell.
            const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
            if (typeof anyGo.setOrigin === 'function') {
                anyGo.setOrigin(0.5);
                anyGo.x = center.x;
                anyGo.y = center.y;
            } else {
                const w = anyGo.displayWidth ?? anyGo.width ?? 0;
                const h = anyGo.displayHeight ?? anyGo.height ?? 0;
                anyGo.x = center.x - w / 2;
                anyGo.y = center.y - h / 2;
            }
        }
    }

    // --- Protected Helper Methods (from original implementation) ---

    protected get cellSize() {
        return { cellW: this.width / this.cols, cellH: this.height / this.rows };
    }

    protected cellBounds(col: number, row: number, colSpan = 1, rowSpan = 1) {
        const { cellW, cellH } = this.cellSize;
        return {
            x: col * cellW,
            y: row * cellH,
            width: colSpan * cellW,
            height: rowSpan * cellH,
        };
    }

    protected tryResize(go: any, width: number, height: number) {
        if (typeof go.setDisplaySize === 'function') {
            go.setDisplaySize(width, height);
        } else if ('width' in go && 'height' in go) {
            const ow = go.width || 1;
            const oh = go.height || 1;
            go.scaleX = width / ow;
            go.scaleY = height / oh;
        }
    }

    protected trySetOriginTopLeft(go: any) {
        if (typeof go.setOrigin === 'function') {
            go.setOrigin(0, 0);
        }
    }
}