import Phaser from "phaser";
import { EventBus } from "../EventBus";
import { TrackData } from "../TrackData";

export class TestGame extends Phaser.Scene {
    constructor() {
        super('TestGame');
    }

    preload() {
    }
    
    create() {
        // Create a container to act as the "canvas"
        const canvas = this.add.container(0, 0);

        // Add assets to the canvas
        const track = this.add.image(0, 0, "track");
        track.setOrigin(0.5, 0.5);
        canvas.add(track);

        const car = this.add.image(0, 0, "red-car");
        car.setOrigin(0.5, 0.5);
        canvas.add(car);

        // Position car relative to track
        const setCarPosition = (x: number, y: number) => {
            car.setPosition(
                x - track.width / 2,
                y - track.height / 2
            );
            car.setScale(0.05);
        };

        // // Calculate coordinates relative to window from track coordinates
        // const getWorldCoordinates = (trackX: number, trackY: number): [number, number] => {
        //     const canvasScale = canvas.scaleX;
        //     const canvasX = canvas.x;
        //     const canvasY = canvas.y;

        //     const worldX = trackX * canvasScale + canvasX;
        //     const worldY = trackY * canvasScale + canvasY;

        //     return [worldX, worldY];
        // };

        // const getTrackCoordinates = (worldX: number, worldY: number): [number, number] => {
        //     const canvasScale = canvas.scaleX;
        //     const canvasX = canvas.x;
        //     const canvasY = canvas.y;

        //     const trackX = (worldX - canvasX) / canvasScale;
        //     const trackY = (worldY - canvasY) / canvasScale;

        //     return [trackX, trackY];
        // };

        // Set car heading to calculated bearing to given coordinates (input coordinates relative to track)
        const setCarHeadingTo = (targetX: number, targetY: number) => {
            const carX = car.x + track.width / 2;
            const carY = car.y + track.height / 2;
            
            const angleRad = Math.atan2(targetY - carY, targetX - carX);
            const angleDeg = Phaser.Math.RadToDeg(angleRad);
            car.setAngle(angleDeg);
        };

        // Resize and center the canvas
        const resizeCanvas = (gameSize: Phaser.Structs.Size) => {
            const newScaleX = (gameSize.width * 0.75) / track.width;
            const newScaleY = (gameSize.height * 0.75) / track.height;
            const newScale = Math.min(newScaleX, newScaleY);

            canvas.setScale(newScale);
            canvas.setPosition(gameSize.width / 2, gameSize.height / 2);
        };
        resizeCanvas(this.scale.gameSize);
        this.scale.on('resize', resizeCanvas);

        const trackData: TrackData = this.cache.json.get('track-data');
        const topography = trackData.topography;
        const coordinates: [number, number][][] = trackData.coordinates;

        let positionCoords: [number, number] = coordinates[21][5];
        setCarPosition(positionCoords[0], positionCoords[1]);

        // --- Click-to-move feature for testing positioning system ---
        // Helper to get pointer position relative to track image (track center is at canvas center)
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // Get canvas transform
            const canvasScale = canvas.scaleX; // uniform scale
            const canvasX = canvas.x;
            const canvasY = canvas.y;

            // Pointer position relative to canvas center
            const relX = (pointer.x - canvasX) / canvasScale;
            const relY = (pointer.y - canvasY) / canvasScale;

            // Convert to track image coordinates (track center is 0,0)
            const trackX = relX + track.width / 2;
            const trackY = relY + track.height / 2;

            // Find closest valid space within 25px radius
            let found = false;
            let closestDist = 25;
            let closestI = -1, closestJ = -1;
            for (let i = 0; i < coordinates.length; i++) {
                for (let j = 0; j < coordinates[i].length; j++) {
                    const [spaceX, spaceY] = coordinates[i][j];
                    if (spaceX == null || spaceY == null) continue;
                    const dist = Math.hypot(trackX - spaceX, trackY - spaceY);
                    if (dist <= closestDist) {
                        found = true;
                        closestDist = dist;
                        closestI = i;
                        closestJ = j;
                    }
                }
            }
            if (found) {
                const topo = topography[closestI][closestJ];
                if (topo != 1 && topo != 2) {
                    const [newX, newY] = coordinates[closestI][closestJ];
                    setCarPosition(newX, newY);
                    // Set car heading toward the next space in the row, or stay if at end
                    const nextSpace = coordinates[closestI]?.[closestJ + 1];
                    const targetX = nextSpace?.[0] ?? newX;
                    const targetY = nextSpace?.[1] ?? newY;
                    setCarHeadingTo(targetX, targetY);
                    console.log(`Moved car to: [${closestI},${closestJ}]`, [newX, newY], 'Topography:', topo);
                }
            }
        });
        // --- End click-to-move feature ---

        // Notify that the scene is ready
        EventBus.emit('current-scene-ready', this);
    }
}