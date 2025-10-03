/**
 * Shared types and interfaces for the widget system.
 */

import Phaser from 'phaser';

export type WidgetLayout = 'horizontal' | 'vertical';

export interface WidgetOptions {
    scene: Phaser.Scene;
    x?: number;
    y?: number;
    width: number;
    height: number;
    cornerRadius?: number;
    layout?: WidgetLayout;
    padding?: number;
    backgroundColor?: number;
    backgroundAlpha?: number;
}
