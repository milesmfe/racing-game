import Phaser from "phaser";
import { EventBus } from "../EventBus";
import { TrackData } from "../TrackData";
import { Player } from "../Player";

export class TestGame extends Phaser.Scene {
    constructor() {
        super('TestGame');
    }

    preload() { }

    create() {
        /**
         * Container for all game objects, dynamically scaled and centered.
         */
        const container = this.add.container(0, 0);

        const trackHeight = this.textures.get("track").getSourceImage().height;
        const resizeContainer = () => {
            const { width, height } = this.scale.gameSize;
            const targetHeight = height * 0.8;
            const scale = targetHeight / trackHeight;
            container.setScale(scale);
            container.setPosition(width / 2, height / 2);
        };
        resizeContainer();
        this.scale.on('resize', resizeContainer);

        const track = this.add.image(0, 0, "track");
        track.setOrigin(0.5, 0.5);
        container.add(track);

        const trackData: TrackData = this.cache.json.get('track-data');
        const topography = trackData.topography;
        const coordinates: [number, number][][] = trackData.coordinates;

        /**
         * Returns the pixel coordinates for a given (i, j) index in the coordinate matrix.
         */
        const getCoordinates = (i: number, j: number): { x: number, y: number } | null => {
            if (i < 0 || i >= coordinates.length) return null;
            if (j < 0 || j >= coordinates[i].length) return null;
            return { x: coordinates[i][j][0], y: coordinates[i][j][1] };
        };

        /**
         * Returns the topography value for a given (i, j) index.
         */
        const getTopography = (i: number, j: number): number | null => {
            if (i < 0 || i >= topography.length) return null;
            if (j < 0 || j >= topography[i].length) return null;
            return topography[i][j];
        };

        /**
         * Converts window/canvas pointer coordinates to track image pixel coordinates (top-left origin).
         */
        const windowToTrackImage = (pointerX: number, pointerY: number) => {
            const scale = container.scaleX;
            const cx = container.x;
            const cy = container.y;
            const relX = (pointerX - cx) / scale;
            const relY = (pointerY - cy) / scale;
            return {
                x: relX + track.width / 2,
                y: relY + track.height / 2
            };
        };

        /**
         * Converts track image pixel coordinates (top-left origin) to container coordinates (center origin).
         */
        const trackImageToContainer = (x: number, y: number) => {
            return {
                x: x - track.width / 2,
                y: y - track.height / 2
            };
        };

        /**
         * Finds the nearest valid space in the coordinate matrix to the given window/canvas coordinates.
         */
        const findNearestValidSpace = ({ x, y }: { x: number, y: number }) => {
            const { x: trackX, y: trackY } = windowToTrackImage(x, y);
            let closestDist = Infinity;
            let closestI = -1, closestJ = -1;
            for (let i = 0; i < coordinates.length; i++) {
                for (let j = 0; j < coordinates[i].length; j++) {
                    const [spaceX, spaceY] = coordinates[i][j];
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
            return { i: closestI, j: closestJ, dist: closestDist };
        };

        const assetMap: Record<number, string> = {
            0: "yellow-car",
            1: "orange-car",
            2: "green-car",
            3: "red-car",
            4: "gray-car",
            5: "purple-car"
        };

        const startingPositionMap: Record<number, [number, number]> = {
            0: [0, 6],
            1: [0, 5],
            2: [0, 4],
            3: [0, 3],
            4: [0, 2],
            5: [0, 1]
        };

        const players: Player[] = [];
        const playerSprites: Phaser.GameObjects.Image[] = [];

        /**
         * Returns the player id occupying the given (i, j) space, or null if unoccupied.
         */
        const getOccupyingPlayerId = (i: number, j: number): number | null => {
            const player = players.find(player => player.currentPosition.x === i && player.currentPosition.y === j);
            return player ? player.id : null;
        };

        /**
         * Moves the player sprite to the specified (i, j) position in the coordinate matrix.
         * Updates heading to point toward the next space in the row.
         */
        const movePlayerTo = (playerId: number, position: { x: number, y: number }) => {
            const player = players.find(p => p.id === playerId);
            if (!player) return;

            const spaceOccupiedBy = getOccupyingPlayerId(position.x, position.y);
            if (spaceOccupiedBy !== null && spaceOccupiedBy != playerId) return;

            player.currentPosition = { x: position.x, y: position.y };

            const sprite = playerSprites[playerId];
            if (!sprite) return;
            const coords = getCoordinates(position.x, position.y);
            if (!coords) return;
            const pos = trackImageToContainer(coords.x, coords.y);
            sprite.setPosition(pos.x, pos.y);

            const nextJ = (position.y + 1) % coordinates[position.x].length;
            const nextCoords = getCoordinates(position.x, nextJ);
            if (nextCoords) {
                const carX = coords.x;
                const carY = coords.y;
                const targetX = nextCoords.x;
                const targetY = nextCoords.y;
                const angleRad = Math.atan2(targetY - carY, targetX - carX);
                const angleDeg = Phaser.Math.RadToDeg(angleRad);
                sprite.setAngle(angleDeg + 180);
            }
        };

        /**
         * Adds a new player to the game at the next available starting position.
         */
        const addPlayer = () => {
            const playerId = players.length;
            if (playerId >= Object.keys(assetMap).length) return;
            const startingPosition = startingPositionMap[playerId];
            const asset = assetMap[playerId];
            const player = new Player(playerId, startingPosition);
            players.push(player);

            const sprite = this.add.image(0, 0, asset);
            sprite.setOrigin(0.5, 0.5);
            sprite.setScale(0.05);
            container.add(sprite);
            playerSprites.push(sprite);
            movePlayerTo(playerId, player.currentPosition);
        };

        // TESTING
        const button = this.add.text(0, 0, "Add Player", {
            font: "24px Arial",
            color: "#ffffff",
            backgroundColor: "#007bff",
            padding: { left: 16, right: 16, top: 8, bottom: 8 },
            align: "center"
        })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", addPlayer);
        container.add(button);

        let currentTurn = 0;

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            const closest = findNearestValidSpace({ x: pointer.x, y: pointer.y });
            if (closest) {
                const topo = getTopography(closest.i, closest.j);
                if (topo !== 1 && topo !== 2) {
                    movePlayerTo(currentTurn, { x: closest.i, y: closest.j });
                    currentTurn++;
                    if (currentTurn === players.length) {
                        currentTurn = 0;
                    }
                }
            }
        });
        // END TESTING

        EventBus.emit('current-scene-ready', this);
    }
}