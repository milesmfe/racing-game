# Grid Layout Package

A small, well-typed grid layout utility for Phaser games — places GameObjects into a flexible row/column grid.

## Quick Start

```typescript
import { GridContainer } from './grid';

// Create a 30x16 grid inside a virtual area
const grid = new GridContainer({ scene: this, width: 1200, height: 640, rows: 16, cols: 30 });

// Add an image and place it at column 2 row 3 spanning 2 columns and 1 row
const img = this.add.image(0, 0, 'car');
grid.addItem(img, { col: 2, row: 3, colSpan: 2, rowSpan: 1, resizeToSpan: true });

// Add a widget or container into a specific cell
const uiContainer = this.add.container(0, 0);
grid.addItem(uiContainer, { col: 5, row: 10, colSpan: 6, rowSpan: 3, resizeToSpan: true });
```

## Behavior & API

- `GridContainer` extends `Phaser.GameObjects.Container` and manages child placement via a grid.
- `addItem(gameObject, options)` returns a `GridItem` which stores metadata about the placement.
- Items can span multiple columns/rows using `colSpan` and `rowSpan`.
- If `resizeToSpan` is true the grid will attempt to resize the GameObject to match the spanned cell area.

## Files

- `GridContainer.ts` — main container that lays out GameObjects.
- `GridItem.ts` — small wrapper describing a single grid entry (col, row, spans, flags).
- `GridTypes.ts` — types for `GridOptions` and `GridItemOptions`.

## Extending

If you need custom behavior for certain GameObjects, extend `GridItem` or subclass `GridContainer` and override `positionItem` or helper methods such as `tryResize` and `trySetOriginTopLeft`.
