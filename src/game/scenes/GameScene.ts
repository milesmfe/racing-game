import { Scene } from 'phaser';
import { GameSetup } from '../GameSetup';
import { Player } from '../Player';
import { TrackData } from '../TrackData';
import { GridContainer } from '../layout/GridContainer';

const VIRTUAL = { W: 1920, H: 1080 };

type Phase = 'moving' | 'moved';

export class GameScene extends Scene {
    private players: Player[];
    private playerImages: Phaser.GameObjects.Image[] = [];
    private numLaps: number;
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
        this.trackImage = this.add.image(VIRTUAL.W / 2, VIRTUAL.H / 2, "track");
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
        
        const uiGrid = new GridContainer(this, {
            rows: 18,
            cols: 32,
            width: VIRTUAL.W,
            height: VIRTUAL.H,
        });
        this.gameContainer.add(uiGrid);

        // TODO: Add UI:
        // Charts
        // Lap Indicator
        // Dice A and B
        // Tire Wear Indicator
        // Brake Wear Indicator
        // Speed Selector/Indicators 0-8
        return true;
    }

    private startMove() {
        if (this.currentPlayerIndex == this.players.length + 1 || this.currentPlayerIndex == null) this.currentPlayerIndex = 0;
        this.phase = 'moving';
    }
}