export type WidgetLayout = 'horizontal' | 'vertical';

export interface WidgetOptions {
    scene: Phaser.Scene;
    width: number;
    height: number;
    x?: number;
    y?: number;
    cornerRadius?: number;
    layout?: WidgetLayout;
    padding?: number;
    progress?: number;
    hitRadius?: number;
}