import { GridOptions } from "./GridOptions";

export class GridContainer extends Phaser.GameObjects.Container {
    public readonly width: number;
    public readonly height: number;
    public readonly rows: number;
    public readonly cols: number;

    constructor(scene: Phaser.Scene, options: GridOptions) {
        super(scene);
        this.width = options.width;
        this.height = options.height;
        this.rows = options.rows;
        this.cols = options.cols;
        this.setSize(this.width, this.height);
    }

    private cellSize() {
        const cellW = this.width / this.cols;
        const cellH = this.height / this.rows;
        return { cellW, cellH };
    }

    cellTopLeft(col: number, row: number) {
        const { cellW, cellH } = this.cellSize();
        return { x: col * cellW, y: row * cellH };
    }

    /**
     * Returns center of a cell or a spanned cell region.
     * colSpan and rowSpan default to 1 (single cell).
     */
    cellCenter(col: number, row: number, colSpan = 1, rowSpan = 1) {
        const { cellW, cellH } = this.cellSize();
        const x = col * cellW + (colSpan * cellW) / 2;
        const y = row * cellH + (rowSpan * cellH) / 2;
        return { x, y };
    }

    /**
     * Returns bounds (top-left and size) of a cell or a spanned region.
     */
    cellBounds(col: number, row: number, colSpan = 1, rowSpan = 1) {
        const { cellW, cellH } = this.cellSize();
        const x = col * cellW;
        const y = row * cellH;
        const width = colSpan * cellW;
        const height = rowSpan * cellH;
        return { x, y, width, height };
    }

    /**
     * Place an object in a single cell (default) or span multiple columns/rows.
     * If resizeToSpan is true, the method will attempt to size the object to fit the spanned area.
     */
    placeInCell(
        go: Phaser.GameObjects.GameObject,
        col: number,
        row: number,
        colSpan = 1,
        rowSpan = 1,
        resizeToSpan = false
    ) {
        const bounds = this.cellBounds(col, row, colSpan, rowSpan);
        const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };

        const anyGo: any = go;

        // Optionally resize the display object to fill the spanned area.
        if (resizeToSpan) {
            // Preferred: use setDisplaySize if available (Images, Sprites, etc.)
            if (typeof anyGo.setDisplaySize === "function") {
                anyGo.setDisplaySize(bounds.width, bounds.height);
            } else if ("displayWidth" in anyGo && "displayHeight" in anyGo) {
                anyGo.displayWidth = bounds.width;
                anyGo.displayHeight = bounds.height;
            } else if ("width" in anyGo && "height" in anyGo) {
                // Fallback: scale based on original width/height if present
                const origW = anyGo.width || 1;
                const origH = anyGo.height || 1;
                anyGo.scaleX = bounds.width / origW;
                anyGo.scaleY = bounds.height / origH;
            }
        }

        // Position object at center of spanned area.
        (anyGo as any).x = center.x;
        (anyGo as any).y = center.y;

        this.add(go);
        return go;
    }
}