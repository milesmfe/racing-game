import { Scene } from 'phaser';
import { GameSetup } from '../GameSetup';
import { Player } from '../Player';
import { TrackData } from '../TrackData';
import { GridContainer } from '../layout/GridContainer';
import { Widget } from '../layout/Widget';

const VIRTUAL = { W: 1920, H: 1080 };

type Phase = 'moving' | 'moved';

export class GameScene extends Scene {
    private players: Player[];
    private playerImages: Phaser.GameObjects.Image[] = [];
    private numLaps: number;
    private currentLap: number = 1;
    private phase: Phase;
    private currentPlayerIndex: number;
    private gameContainer: Phaser.GameObjects.Container;
    private trackImage: Phaser.GameObjects.Image;

    startingPositionMap: Record<number, { i: number, j: number }> = {
        0: { i: 0, j: 6 },
        1: { i: 0, j: 5 },
        2: { i: 0, j: 4 },
        3: { i: 0, j: 3 },
        4: { i: 0, j: 2 },
        5: { i: 0, j: 1 }
    };

    private get trackData(): TrackData {
        return this.cache.json.get('track-data') as TrackData;
    }

    constructor() {
        super('GameScene');
    }

    preload() { }

    create(data?: GameSetup) {
        if (!data) throw new Error('GameScene initialized without game setup data.');
        if (!data.players || !data.numLaps) throw new Error('GameScene initialized with incomplete game setup data.');
        this.players = data.players;
        this.numLaps = data.numLaps;
        if (!this.setupGame()) throw new Error('GameScene setup failed.');
        this.startMove();
    }

    /**
     * Returns the pixel coordinates for a given (i, j) index in the coordinate matrix.
     * @param i Row index
     * @param j Column index
     * @returns Pixel coordinates or null
     */
    getCoordinates(i: number, j: number): { x: number, y: number } | null {
        if (i < 0 || i >= this.trackData.coordinates.length) return null;
        if (j < 0 || j >= this.trackData.coordinates[i].length) return null;
        return { x: this.trackData.coordinates[i][j][0], y: this.trackData.coordinates[i][j][1] };
    }

    /**
     * Returns the topography value for a given (i, j) index.
     * @param i Row index
     * @param j Column index
     * @returns Topography value or null
     */
    getTopography(i: number, j: number): number | null {
        if (i < 0 || i >= this.trackData.topography.length) return null;
        if (j < 0 || j >= this.trackData.topography[i].length) return null;
        return this.trackData.topography[i][j];
    }

    private placePlayerOnTrack(playerId: number, pos: { i: number, j: number }) {
        const playerImage = this.playerImages[playerId];
        if (!playerImage) throw new Error(`Invalid player ID: ${playerId}`);
        const cell = this.trackData.coordinates[pos.i][pos.j];
        if (!cell) throw new Error(`Invalid track position (${pos.i}, ${pos.j})`);
        const scaleX = this.trackImage.scaleX;
        const scaleY = this.trackImage.scaleY;
        const displayW = this.trackImage.displayWidth;
        const displayH = this.trackImage.displayHeight;
        const trackTopLeftX = this.trackImage.x - displayW / 2;
        const trackTopLeftY = this.trackImage.y - displayH / 2;
        playerImage.setPosition(
            trackTopLeftX + cell[0] * scaleX,
            trackTopLeftY + cell[1] * scaleY
        );
        const coords = this.getCoordinates(pos.i, pos.j);
        if (!coords) return;
        const nextJ = (pos.j + 1) % this.trackData.coordinates[pos.i].length;
        const nextPosCoords = this.getCoordinates(pos.i, nextJ);
        if (!nextPosCoords) return;
        const angleRad = Math.atan2(nextPosCoords.y - coords.y, nextPosCoords.x - coords.x);
        const angleDeg = Phaser.Math.RadToDeg(angleRad);
        playerImage.setAngle(angleDeg + 180);
    }

    private setupGame(): boolean {
        // Game container for scaling
        this.gameContainer = this.add.container(0, 0);
        this.gameContainer.setSize(VIRTUAL.W, VIRTUAL.H);
        const resizeContainer = () => {
            const { width, height } = this.scale.gameSize;
            const scale = Math.min(width / VIRTUAL.W, height / VIRTUAL.H);
            this.gameContainer.setScale(scale);
            this.gameContainer.x = (width - VIRTUAL.W * scale) / 2;
            this.gameContainer.y = (height - VIRTUAL.H * scale) / 2;
        };
        resizeContainer();
        this.scale.on('resize', resizeContainer);

        // Track
        this.trackImage = this.add.image(VIRTUAL.W / 2, 5 * VIRTUAL.H / 12, "track");
        this.trackImage.setSize(VIRTUAL.W, VIRTUAL.H);
        this.trackImage.setScale(0.5);
        this.gameContainer.add(this.trackImage);

        // Players
        const palette = ['yellow-car', 'orange-car', 'green-car', 'red-car', 'gray-car', 'purple-car'];
        this.players.forEach((player, index) => {
            const car = this.add.image(0, 0, palette[index]);
            car.setScale(0.025);
            this.playerImages.push(car);
            this.gameContainer.add(car);
            const pos = this.startingPositionMap[index];
            this.placePlayerOnTrack(player.id, pos);
        });

        // Grid
        const uiGrid = new GridContainer(this, {
            cols: 32,
            rows: 18,
            width: VIRTUAL.W,
            height: VIRTUAL.H,
        });
        this.gameContainer.add(uiGrid);

        // Charts
        const charts = this.add.image(0, 0, 'charts');
        uiGrid.placeInCell(charts, 25, 1, 6, 12);

        // Lap Indicator
        const lapIndicator = Widget
            .create({
                scene: this,
                width: 120,
                height: 120,
                cornerRadius: 20,
                layout: 'vertical',
                padding: 8
            })
            .addText('Lap', 18, '#ffffff')
            .addText(`${this.currentLap} / ${this.numLaps}`, 28, '#ffff00')
            .getContainer();

        uiGrid.placeInCell(lapIndicator, 3, 6, 2, 2);

        // Dice A and Dice B
        const makeDiceWidget = (label: string) => {
            const w = Widget.create({
                scene: this,
                width: 120,
                height: 120,
                cornerRadius: 20,
                layout: 'vertical',
                padding: 8
            })
                .addText(label, 18, '#ccc')
                .addText('?', 36, '#ffff00')
                .getContainer();
            return w;
        };
        const diceA = makeDiceWidget('Dice A');
        const diceB = makeDiceWidget('Dice B');
        uiGrid.placeInCell(diceA, 2, 9, 2, 2);
        uiGrid.placeInCell(diceB, 4, 9, 2, 2);

        // Tire Wear Indicator
        const tireWidget = Widget.create({
            scene: this,
            width: 240,
            height: 120,
            cornerRadius: 20,
            layout: 'vertical',
            padding: 8
        })
            .addText('Tire Wear', 16, '#fff')
            .addText('3', 16, '#ffff00')
            .addBar(3 / 8)
            .getContainer();

        uiGrid.placeInCell(tireWidget, 2, 14, 4, 2);

        // Brake Wear Indicator
        const brakeWidget = Widget.create({
            scene: this,
            width: 240,
            height: 120,
            cornerRadius: 20,
            layout: 'vertical',
            padding: 8
        })
            .addText('Brake Wear', 16, '#fff')
            .addText('7', 16, '#ffff00')
            .addBar(7 / 8)
            .getContainer();

        uiGrid.placeInCell(brakeWidget, 26, 14, 4, 2);

        // Speed Selector / Indicators 0-8
        const speedWidget = Widget.create({
            scene: this,
            width: 1080,
            height: 120,
            cornerRadius: 20,
            layout: 'horizontal',
            padding: 8
        });

        for (let speed = 0; speed <= 140; speed += 20) {
            speedWidget
                .addText(`${speed}`, 24, '#ffffff', { speed })
        }

        uiGrid.placeInCell(speedWidget.getContainer(), 7, 14, 18, 2);

        return true;
    }

    private startMove() {
        if (this.currentPlayerIndex == this.players.length + 1 || this.currentPlayerIndex == null) this.currentPlayerIndex = 0;
        this.phase = 'moving';
    }
}