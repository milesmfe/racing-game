
import Phaser from "phaser";
import { EventBus } from "../EventBus";
import { TrackData, TrackSpaceType } from "../TrackData";
import { Player } from "../Player";


export class TestGame extends Phaser.Scene {
    /**
     * Matrix of pixel coordinates for each track space.
     */
    coordinates: [number, number][][];

    /**
     * Matrix of topography values for each track space.
     */
    topography: number[][];

    /**
     * Main container for all scene elements.
     */
    container: Phaser.GameObjects.Container;

    /**
     * Track image object.
     */
    track: Phaser.GameObjects.Image;

    /**
     * Start game button.
     */
    startButton: Phaser.GameObjects.Text;

    /**
     * Add player button.
     */
    addPlayerButton: Phaser.GameObjects.Text;

    /**
     * Move player button.
     */
    moveButton: Phaser.GameObjects.Text;

    /**
     * Current player's turn id.
     */
    playerTurnId: number | null = null;

    /**
     * Spaces selected for the current move.
     */
    stepSpaces: { i: number, j: number }[] = [];

    /**
     * Spaces available for selection in the current turn.
     */
    availableSpaces: { i: number, j: number }[] = [];

    /**
     * Highlight circles for selected spaces.
     */
    selectedHighlightCircles: Phaser.GameObjects.Arc[] = [];

    /**
     * Currently hovered space.
     */
    hoveredSpace: { i: number, j: number } | null = null;

    /**
     * Highlight circle for hovered space.
     */
    hoverHighlightCircle: Phaser.GameObjects.Arc | null = null;

    /**
     * List of player objects.
     */
    players: Player[] = [];

    /**
     * List of player sprite objects.
     */
    playerSprites: Phaser.GameObjects.Image[] = [];

    /**
     * Mapping of player id to car asset key.
     */
    assetMap: Record<number, string> = {
        0: "yellow-car",
        1: "orange-car",
        2: "green-car",
        3: "red-car",
        4: "gray-car",
        5: "purple-car"
    };

    /**
     * Mapping of player id to starting position.
     */
    startingPositionMap: Record<number, { i: number, j: number }> = {
        0: { i: 0, j: 6 },
        1: { i: 0, j: 5 },
        2: { i: 0, j: 4 },
        3: { i: 0, j: 3 },
        4: { i: 0, j: 2 },
        5: { i: 0, j: 1 }
    };

    constructor() {
        super('TestGame');
    }

    /**
     * Preloads assets for the scene.
     */
    preload() { }

    /**
     * Creates the scene and initializes all game objects and UI.
     */
    create() {
        this.initSceneElements();
        this.initUI();
        this.initEventListeners();
        EventBus.emit('current-scene-ready', this);
    }

    /**
     * Initializes main scene elements and loads track data.
     */
    private initSceneElements() {
        this.container = this.add.container(0, 0);
        const trackHeight = this.textures.get("track").getSourceImage().height;
        const resizeContainer = () => {
            const { width, height } = this.scale.gameSize;
            const targetHeight = height * 0.8;
            const scale = targetHeight / trackHeight;
            this.container.setScale(scale);
            this.container.setPosition(width / 2, height / 2);
        };
        resizeContainer();
        this.track = this.add.image(0, 0, "track");
        this.track.setOrigin(0.5, 0.5);
        this.container.add(this.track);
        const trackData: TrackData = this.cache.json.get('track-data');
        this.topography = trackData.topography;
        this.coordinates = trackData.coordinates;
        this.scale.on('resize', resizeContainer);
    }

    /**
     * Initializes UI elements and their event handlers.
     */
    private initUI() {
        this.startButton = this.add.text(0, 0, "Start", {
            font: "24px Arial",
            color: "#ffffff",
            backgroundColor: "#007bff",
            padding: { left: 16, right: 16, top: 8, bottom: 8 },
            align: "center"
        })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => this.handleStartButton());
        this.container.add(this.startButton);

        this.addPlayerButton = this.add.text(0, 50, "Add Player", {
            font: "24px Arial",
            color: "#ffffff",
            backgroundColor: "#28a745",
            padding: { left: 16, right: 16, top: 8, bottom: 8 },
            align: "center"
        })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => this.addPlayer());
        this.container.add(this.addPlayerButton);

        this.moveButton = this.add.text(0, 100, "Move", {
            font: "24px Arial",
            color: "#ffffff",
            backgroundColor: "#d8365cff",
            padding: { left: 16, right: 16, top: 8, bottom: 8 },
            align: "center"
        })
            .setOrigin(0.5)
            .on("pointerdown", () => this.handleMoveButton())
            .disableInteractive();
        this.container.add(this.moveButton);
    }

    /**
     * Initializes input and pointer event listeners.
     */
    private initEventListeners() {
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.handlePointerMove(pointer));
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.handlePointerDown(pointer));
    }

    /**
     * Handles the start button click event.
     */
    private handleStartButton() {
        if (this.players.length === 0) return;
        this.playerTurnId = 0;
        this.stepSpaces = [];
        this.availableSpaces = [];
        this.addPlayerButton.disableInteractive();
        this.startButton.disableInteractive();
        this.moveButton.setInteractive({ useHandCursor: true });
        this.startTurn();
    }

    /**
     * Handles the move button click event.
     */
    private handleMoveButton() {
        if (this.playerTurnId == null) return;
        if (this.stepSpaces.length === 0) return;
        this.movePlayerTo(this.playerTurnId, this.stepSpaces[this.stepSpaces.length - 1]);
        this.stepSpaces = [];
        this.availableSpaces = [];
        this.hoveredSpace = null;
        this.hoverHighlightCircle?.destroy();
        this.hoverHighlightCircle = null;
        this.selectedHighlightCircles.forEach(circle => circle.destroy());
        this.selectedHighlightCircles = [];
        this.playerTurnId++;
        if (this.playerTurnId === this.players.length) {
            this.playerTurnId = 0;
        }
        this.startTurn();
    }

    /**
     * Handles pointer move events for highlighting spaces.
     * @param pointer Phaser pointer object
     */
    private handlePointerMove(pointer: Phaser.Input.Pointer) {
        if (this.playerTurnId == null) return;
        const closest = this.findNearestValidSpace({ x: pointer.x, y: pointer.y });
        if (!closest) { this.hoverHighlightCircle?.destroy(); return; }
        if (closest === this.hoveredSpace) return;
        if (this.stepSpaces?.includes(closest)) return;
        const topo = this.getTopography(closest.i, closest.j);
        if (topo === TrackSpaceType.INVISIBLE_SPACE || topo === TrackSpaceType.OUT_OF_BOUNDS || topo === TrackSpaceType.SPIN_OFF_ZONE) return;
        const coords = this.getCoordinates(closest.i, closest.j);
        if (!coords) return;
        this.hoverHighlightCircle?.destroy();
        const pos = this.trackImageToContainer(coords.x, coords.y);
        this.hoverHighlightCircle = this.add.circle(pos.x, pos.y, 15, 0xffff00, 0.5);
        this.hoverHighlightCircle.setDepth(100);
        this.container.add(this.hoverHighlightCircle);
    }

    /**
     * Handles pointer down events for selecting spaces.
     * @param pointer Phaser pointer object
     */
    private handlePointerDown(pointer: Phaser.Input.Pointer) {
        if (this.playerTurnId == null) return;
        const closest = this.findNearestValidSpace({ x: pointer.x, y: pointer.y });
        if (!closest) return;
        // If clicked space is the last item in stepSpaces, remove it
        const lastStep = this.stepSpaces[this.stepSpaces.length - 1];
        if (lastStep != null && lastStep.i === closest.i && lastStep.j === closest.j) {
            // Remove last highlight circle
            const lastCircle = this.selectedHighlightCircles.pop();
            lastCircle?.destroy();
            this.stepSpaces.pop();
            // Recalculate available spaces based on previous step or current player position
            const prev = this.stepSpaces[this.stepSpaces.length - 1] || this.players[this.playerTurnId].currentPosition;
            this.availableSpaces = this.findSelectableSpaces(prev);
            return;
        }
        const isAvailable = this.availableSpaces.some(s => s.i === closest.i && s.j === closest.j);
        if (!isAvailable) return;
        const coords = this.getCoordinates(closest.i, closest.j);
        if (!coords) return;
        this.hoverHighlightCircle?.destroy();
        this.hoverHighlightCircle = null;
        this.hoveredSpace = null;
        const pos = this.trackImageToContainer(coords.x, coords.y);
        const toHighlight = this.add.circle(pos.x, pos.y, 15, 0x00ff00, 0.5);
        this.container.add(toHighlight);
        toHighlight.setDepth(1000);
        this.selectedHighlightCircles.push(toHighlight);
        this.stepSpaces.push(closest);
        this.availableSpaces = this.findSelectableSpaces(closest);
    }

    /**
     * Starts the current player's turn and updates available spaces.
     */
    startTurn() {
        if (this.playerTurnId == null) return;
        const player = this.players[this.playerTurnId];
        this.availableSpaces = this.findSelectableSpaces(player.currentPosition);
    }

    /**
     * Returns the pixel coordinates for a given (i, j) index in the coordinate matrix.
     * @param i Row index
     * @param j Column index
     * @returns Pixel coordinates or null
     */
    getCoordinates(i: number, j: number): { x: number, y: number } | null {
        if (i < 0 || i >= this.coordinates.length) return null;
        if (j < 0 || j >= this.coordinates[i].length) return null;
        return { x: this.coordinates[i][j][0], y: this.coordinates[i][j][1] };
    }

    /**
     * Returns the topography value for a given (i, j) index.
     * @param i Row index
     * @param j Column index
     * @returns Topography value or null
     */
    getTopography(i: number, j: number): number | null {
        if (i < 0 || i >= this.topography.length) return null;
        if (j < 0 || j >= this.topography[i].length) return null;
        return this.topography[i][j];
    }

    /**
     * Converts window/canvas pointer coordinates to track image pixel coordinates (top-left origin).
     * @param pointerX X coordinate
     * @param pointerY Y coordinate
     * @returns Track image pixel coordinates
     */
    windowToTrackImage(pointerX: number, pointerY: number) {
        const scale = this.container.scaleX;
        const cx = this.container.x;
        const cy = this.container.y;
        const relX = (pointerX - cx) / scale;
        const relY = (pointerY - cy) / scale;
        return {
            x: relX + this.track.width / 2,
            y: relY + this.track.height / 2
        };
    }

    /**
     * Converts track image pixel coordinates (top-left origin) to container coordinates (center origin).
     * @param x X coordinate
     * @param y Y coordinate
     * @returns Container coordinates
     */
    trackImageToContainer(x: number, y: number) {
        return {
            x: x - this.track.width / 2,
            y: y - this.track.height / 2
        };
    }

    /**
     * Finds the nearest valid space in the coordinate matrix to the given window/canvas coordinates.
     * @param param0 Object with x and y properties
     * @returns Closest valid space or null
     */
    findNearestValidSpace({ x, y }: { x: number, y: number }) {
        const { x: trackX, y: trackY } = this.windowToTrackImage(x, y);
        let closestDist = Infinity;
        let closestI = -1, closestJ = -1;
        for (let i = 0; i < this.coordinates.length; i++) {
            for (let j = 0; j < this.coordinates[i].length; j++) {
                const [spaceX, spaceY] = this.coordinates[i][j];
                if (spaceX == null || spaceY == null) continue;
                const dist = Math.hypot(trackX - spaceX, trackY - spaceY);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestI = i;
                    closestJ = j;
                }
            }
        }
        if (closestI === -1 || closestJ === -1) return null;
        if (closestDist > 100) return null;
        return { i: closestI, j: closestJ, dist: closestDist };
    }

    /**
     * Returns the player id occupying the given (i, j) space, or null if unoccupied.
     * @param i Row index
     * @param j Column index
     * @returns Player id or null
     */
    getOccupyingPlayerId(i: number, j: number): number | null {
        const player = this.players.find(player => player.currentPosition.i === i && player.currentPosition.j === j);
        return player ? player.id : null;
    }

    /**
     * Moves the player sprite to the specified (i, j) position in the coordinate matrix and updates heading.
     * @param playerId Player id
     * @param position Position object with i and j
     */
    movePlayerTo(playerId: number, position: { i: number, j: number }) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        const spaceOccupiedBy = this.getOccupyingPlayerId(position.i, position.j);
        if (spaceOccupiedBy !== null && spaceOccupiedBy != playerId) return;
        player.currentPosition = { i: position.i, j: position.j };
        const sprite = this.playerSprites[playerId];
        if (!sprite) return;
        const coords = this.getCoordinates(position.i, position.j);
        if (!coords) return;
        const pos = this.trackImageToContainer(coords.x, coords.y);
        sprite.setPosition(pos.x, pos.y);
        const nextJ = (position.j + 1) % this.coordinates[position.i].length;
        const nextCoords = this.getCoordinates(position.i, nextJ);
        if (nextCoords) {
            const carX = coords.x;
            const carY = coords.y;
            const targetX = nextCoords.x;
            const targetY = nextCoords.y;
            const angleRad = Math.atan2(targetY - carY, targetX - carX);
            const angleDeg = Phaser.Math.RadToDeg(angleRad);
            sprite.setAngle(angleDeg + 180);
        }
    }

    /**
     * Adds a new player to the game at the next available starting position.
     */
    addPlayer() {
        const playerId = this.players.length;
        if (playerId >= Object.keys(this.assetMap).length) return;
        const startingPosition = this.startingPositionMap[playerId];
        const asset = this.assetMap[playerId];
        const player = new Player(playerId);
        player.currentPosition = startingPosition;
        this.players.push(player);
        const sprite = this.add.image(0, 0, asset);
        sprite.setOrigin(0.5, 0.5);
        sprite.setScale(0.05);
        this.container.add(sprite);
        this.playerSprites.push(sprite);
        this.movePlayerTo(playerId, player.currentPosition);
    }

    /**
     * Finds selectable spaces directly ahead and diagonally ahead (left and right) from the current space.
     * Handles invisible spaces with extra step logic:
     *  F  → delta1 = (1,0), delta2 = (1,0)
     *  FL → delta1 = (0,1), delta2 = (1,-1)
     *  FR → delta1 = (0,-1), delta2 = (1,-1)
     */
    findSelectableSpaces(current: { i: number; j: number }): { i: number; j: number }[] {
        const results: { i: number; j: number }[] = [];

        // direction + deltas when encountering invisible spaces
        const directions = [
            {
                name: "F",
                di: 1, dj: 0,
                delta1: { di: 1, dj: 0 },
                delta2: { di: 1, dj: 0 }
            },
            {
                name: "FL",
                di: 1, dj: 1,
                delta1: { di: 0, dj: 1 },
                delta2: { di: 1, dj: -1 }
            },
            {
                name: "FR",
                di: 1, dj: -1,
                delta1: { di: 0, dj: -1 },
                delta2: { di: 1, dj: 1 }
            }
        ];

        const isBlocking = (topo: TrackSpaceType | null | undefined) =>
            topo == null || topo === TrackSpaceType.OUT_OF_BOUNDS || topo === TrackSpaceType.SPIN_OFF_ZONE;

        for (const dir of directions) {
            // Step 1: initial move
            let pos = { i: current.i === this.topography.length - 1 ? 0 : current.i + dir.di, j: current.j + dir.dj };
            let topo = this.getTopography(pos.i, pos.j);
            if (isBlocking(topo) || this.getOccupyingPlayerId(pos.i, pos.j) !== null) continue;
            if (topo !== TrackSpaceType.INVISIBLE_SPACE) {
                results.push(pos);
                continue;
            }

            // Step 2: invisible -> apply delta1
            pos = { i: pos.i + dir.delta1.di, j: pos.j + dir.delta1.dj };
            topo = this.getTopography(pos.i, pos.j);
            if (isBlocking(topo) || this.getOccupyingPlayerId(pos.i, pos.j) !== null) continue;
            if (topo !== TrackSpaceType.INVISIBLE_SPACE) {
                results.push(pos);
                continue;
            }

            // Step 3: still invisible -> apply delta2
            pos = { i: pos.i + dir.delta2.di, j: pos.j + dir.delta2.dj };
            topo = this.getTopography(pos.i, pos.j);
            if (isBlocking(topo) || this.getOccupyingPlayerId(pos.i, pos.j) !== null) continue;
            if (topo !== TrackSpaceType.INVISIBLE_SPACE) {
                results.push(pos);
            }
        }
        return results;
    }
}