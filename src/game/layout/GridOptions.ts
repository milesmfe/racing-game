/**
 * Configuration options for a grid layout.
 *
 * @property width - Total width of the grid in pixels.
 * @property height - Total height of the grid in pixels.
 * @property rows - Number of horizontal subdivisions (rows).
 * @property cols - Number of vertical subdivisions (columns).
 */
export interface GridOptions {
    width: number;
    height: number;
    rows: number;
    cols: number;
}