import { Scene } from 'phaser';
import { GridContainer } from '../layout/grid';
import { Widget } from '../layout/widgets';

const VIRTUAL = { W: 1920, H: 1080 };

interface PlayerResult {
    id: number;
    name: string;
}

export class GameEndScene extends Scene {
    private winner: PlayerResult | null = null;
    private podiumPlayers: PlayerResult[] = [];
    private carPalette: string[] = ['yellow-car', 'orange-car', 'green-car', 'red-car', 'gray-car', 'purple-car'];
    private sceneContainer!: Phaser.GameObjects.Container;

    constructor() {
        super('GameEndScene');
    }

    init(data: { winner: PlayerResult | null, podiumPlayers: PlayerResult[] }) {
        this.winner = data.winner;
        this.podiumPlayers = data.podiumPlayers || [];
    }

    create() {
        this.cameras.main.setBackgroundColor('#2c2c2c');
        this.sceneContainer = this.add.container(0, 0);
        this.sceneContainer.setSize(VIRTUAL.W, VIRTUAL.H);
        const resizeContainer = () => {
            const { width, height } = this.scale.gameSize;
            const scale = Math.min(width / VIRTUAL.W, height / VIRTUAL.H);
            this.sceneContainer.setScale(scale);
            this.sceneContainer.x = (width - VIRTUAL.W * scale) / 2;
            this.sceneContainer.y = (height - VIRTUAL.H * scale) / 2;
        };
        resizeContainer();
        this.scale.on('resize', resizeContainer);
        const grid = new GridContainer({ scene: this, cols: 3, rows: 4, width: VIRTUAL.W, height: VIRTUAL.H });
        const titleWidget = new Widget({ scene: this, backgroundAlpha: 0, width: VIRTUAL.W, height: VIRTUAL.H / 4 });
        const titleText = this.winner ? `Winner: ${this.winner.name}!` : "Race Finished!";
        titleWidget.addText(titleText, 72, '#ffff00');
        grid.addItem(titleWidget.getContainer(), { col: 0, row: 0, colSpan: 3, rowSpan: 1 });
        this.createPodium(grid);
        this.sceneContainer.add(grid);
    }

    private createPodium(grid: GridContainer): void {
        const podiumLayout = [
            { rank: 1, col: 1, row: 1, colSpan: 1, rowSpan: 3 },
            { rank: 2, col: 0, row: 1, colSpan: 1, rowSpan: 3 },
            { rank: 3, col: 2, row: 1, colSpan: 1, rowSpan: 3 }
        ];

        const podiumHeights: { [key: number]: number } = { 1: 3 * VIRTUAL.H / 4, 2: VIRTUAL.H / 2, 3: VIRTUAL.H / 4 };

        for (const layout of podiumLayout) {
            if (this.podiumPlayers.length < layout.rank) continue;

            const player = this.podiumPlayers[layout.rank - 1];
            if (!player) continue;

            const podiumStep = new Widget({
                scene: this,
                width: VIRTUAL.W / 3,
                height: podiumHeights[layout.rank],
                cornerRadius: 10,
                layout: 'vertical',
                padding: 16,
                backgroundColor: 0x555555
            });

            podiumStep.addImage(this.carPalette[player.id % this.carPalette.length], 0.1);
            podiumStep.addText(`${layout.rank}`, 48, '#ffffff');
            podiumStep.addText(player.name, 32, '#ffffff');

            grid.addItem(podiumStep.getContainer(), layout);
        }
    }
}