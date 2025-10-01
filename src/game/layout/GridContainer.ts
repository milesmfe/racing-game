import { GridOptions } from "./GridOptions";

/**
 * GridContainer is a lightweight helper for placing Phaser GameObjects into a grid.
 * It exposes utility methods for cell geometry and a single placement method.
 */
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

    /**
     * Cell width/height as computed from container size and grid dimensions.
     */
    private get cellSize() {
        return { cellW: this.width / this.cols, cellH: this.height / this.rows };
    }

    /**
     * Top-left coordinates of a given cell.
     */
    cellTopLeft(col: number, row: number) {
        const { cellW, cellH } = this.cellSize;
        return { x: col * cellW, y: row * cellH };
    }

    /**
     * Center point of a (possibly spanned) cell region.
     */
    cellCenter(col: number, row: number, colSpan = 1, rowSpan = 1) {
        const { cellW, cellH } = this.cellSize;
        return {
            x: col * cellW + (colSpan * cellW) / 2,
            y: row * cellH + (rowSpan * cellH) / 2,
        };
    }

    /**
     * Bounds of a (possibly spanned) cell region.
     */
    cellBounds(col: number, row: number, colSpan = 1, rowSpan = 1) {
        const { cellW, cellH } = this.cellSize;
        return {
            x: col * cellW,
            y: row * cellH,
            width: colSpan * cellW,
            height: rowSpan * cellH,
        };
    }

    /**
     * Resize a display-like GameObject to the target width/height if possible.
     * This prefers setDisplaySize and falls back to common size/scale properties.
     */
    private tryResize(go: any, width: number, height: number) {
        if (typeof go.setDisplaySize === "function") {
            go.setDisplaySize(width, height);
            return;
        }

        if ("displayWidth" in go && "displayHeight" in go) {
            go.displayWidth = width;
            go.displayHeight = height;
            return;
        }

        if ("width" in go && "height" in go) {
            const ow = go.width || 1;
            const oh = go.height || 1;
            go.scaleX = width / ow;
            go.scaleY = height / oh;
        }
    }

    /**
     * Try to set origin to (0,0) using setOrigin or writable originX/originY properties.
     */
    private trySetOriginTopLeft(go: any) {
        if (typeof go.setOrigin === "function") {
            go.setOrigin(0, 0);
            return;
        }

        try {
            const proto = Object.getPrototypeOf(go) || {};
            const descX = Object.getOwnPropertyDescriptor(go, "originX") || Object.getOwnPropertyDescriptor(proto, "originX");
            const descY = Object.getOwnPropertyDescriptor(go, "originY") || Object.getOwnPropertyDescriptor(proto, "originY");
            if (!descX || descX.writable) go.originX = 0;
            if (!descY || descY.writable) go.originY = 0;
        } catch (e) {
            // ignored: some objects have read-only origin properties
        }
    }

    /**
     * Place a GameObject in a grid cell. Multi-cell spans anchor at top-left and optionally resize to fill.
     * Single-cell placement centers the object in the target cell.
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
        const anyGo: any = go;

        if (resizeToSpan) this.tryResize(anyGo, bounds.width, bounds.height);

        if (colSpan > 1 || rowSpan > 1) {
            this.trySetOriginTopLeft(anyGo);
            anyGo.x = bounds.x;
            anyGo.y = bounds.y;
        } else {
            const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
            anyGo.x = center.x;
            anyGo.y = center.y;
        }

        this.add(go);
        return go;
    }
}