import { Scene } from 'phaser';
import { GameSetup } from '../GameSetup';
import { Player } from '../Player';
import { TrackData, TrackSpaceType } from '../TrackData';
import { GridContainer } from '../layout/grid';
import { Widget, HitboxWidget, TextItem, ProgressBarItem } from '../layout/widgets';

const VIRTUAL = { W: 1920, H: 1080 };
const MAX_TYRE_WEAR = 8;
const MAX_BRAKE_WEAR = 5;

type Phase = 'speedselect' | 'moving' | 'penalty' | 'moved' | 'finished';

export class GameScene extends Scene {
    // Game State
    private players: Player[];
    private numLaps: number;
    private phase: Phase;
    private currentPlayerIndex: number;
    private requiredSteps: number = 0;
    private die1Result: number | null = null;
    private die2Result: number | null = null;
    private cornerPenaltyContext: { player: Player, excessSpeed: number, corner: { i: number, j: number } } | null = null;
    private cornersToResolve: { i: number, j: number }[] = [];

    // Game Objects
    private gameContainer: Phaser.GameObjects.Container;
    private trackImage: Phaser.GameObjects.Image;
    private playerImages: Phaser.GameObjects.Image[] = [];

    // UI Elements
    private message: TextItem;
    private confirmMoveButton: HitboxWidget;
    private die1Widget: HitboxWidget;
    private die2Widget: HitboxWidget;
    private die1Text: TextItem;
    private die2Text: TextItem;
    private tyreWearText: TextItem;
    private brakeWearText: TextItem;
    private tyreWearBar: ProgressBarItem;
    private brakeWearBar: ProgressBarItem;
    private lapText: TextItem;

    // Player Interaction
    private stepSpaces: { i: number, j: number }[] = [];
    private availableSpaces: { i: number, j: number }[] = [];
    private selectedHighlightCircles: Phaser.GameObjects.Arc[] = [];
    private hoveredSpace: { i: number, j: number } | null = null;
    private hoverHighlightCircle: Phaser.GameObjects.Arc | null = null;
    private selectionCircleRadius: number = 15;

    private startingPositionMap: Record<number, { i: number, j: number }> = {
        0: { i: 0, j: 6 }, 1: { i: 0, j: 5 }, 2: { i: 0, j: 4 },
        3: { i: 0, j: 3 }, 4: { i: 0, j: 2 }, 5: { i: 0, j: 1 }
    };

    private pitStopMap: Record<number, { i: number, j: number }> = {
        0: { i: 2, j: 0 }, 1: { i: 1, j: 0 }, 2: { i: 0, j: 0 },
        3: { i: 64, j: 0 }, 4: { i: 63, j: 0 }, 5: { i: 62, j: 0 }
    };

    private get trackData(): TrackData {
        return this.cache.json.get('track-data') as TrackData;
    }

    constructor() {
        super('GameScene');
    }

    // ================================================================================================================
    // PHASER SCENE LIFECYCLE
    // ================================================================================================================

    preload() { }

    create(data?: GameSetup) {
        if (!data?.players || !data.numLaps) {
            throw new Error('GameScene initialized with incomplete game setup data.');
        }
        this.players = data.players.map(p => ({ ...p, brakeWear: 0, tyreWear: 0, lapsRemaining: data.numLaps, currentSpeed: 0 }));
        this.numLaps = data.numLaps;
        this.setupGame();
        this.startMove();
    }

    // ================================================================================================================
    // GAME SETUP
    // ================================================================================================================

    private setupGame(): void {
        this.setupGameContainer();
        this.setupTrack();
        this.setupPlayers();
        this.setupUI();
        this.setupInputHandlers();
    }

    private setupGameContainer(): void {
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
    }

    private setupTrack(): void {
        this.trackImage = this.add.image(VIRTUAL.W / 2, 5 * VIRTUAL.H / 12, "track");
        this.trackImage.setScale(0.5);
        this.gameContainer.add(this.trackImage);
    }

    private setupPlayers(): void {
        const palette = ['yellow-car', 'orange-car', 'green-car', 'red-car', 'gray-car', 'purple-car'];
        this.players.forEach((player, index) => {
            const car = this.add.image(0, 0, palette[index % palette.length]);
            car.setScale(0.025);
            this.playerImages.push(car);
            this.gameContainer.add(car);
            const pos = this.startingPositionMap[index];
            player.currentPosition = pos;
            this.placePlayerOnTrack(player.id, pos);
        });
    }

    private setupUI(): void {
        const grid = new GridContainer({ scene: this, cols: 32, rows: 18, width: VIRTUAL.W, height: VIRTUAL.H });
        this.gameContainer.add(grid);
        this.createLapIndicator(grid);
        this.createDiceWidgets(grid);
        this.createWearIndicators(grid);
        this.createSpeedSelector(grid);
        this.createMessageBox(grid);
        this.createConfirmMoveButton(grid);
    }

    private setupInputHandlers(): void {
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.handlePointerMove(pointer));
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.handlePointerDown(pointer));
    }

    // ================================================================================================================
    // GAME STATE MANAGEMENT
    // ================================================================================================================

    private startMove(): void {
        this.phase = 'speedselect';
        this.currentPlayerIndex = (this.currentPlayerIndex == null) ? 0 : (this.currentPlayerIndex + 1) % this.players.length;
        this.updateUI();
    }

    private selectSpeed = (speed: number): void => {
        if (this.phase !== 'speedselect') return;
        const player = this.players[this.currentPlayerIndex];
        const speedChange = speed - player.currentSpeed;

        if (speedChange > 60) {
            this.message.setText('Cannot increase speed by more than 60 mph in one turn.');
            return;
        }

        if (speedChange < -20 && player.brakeWear >= MAX_BRAKE_WEAR) {
            this.message.setText('Max brake wear! Forced to spin off.');
            this.spinOff(player, player.currentPosition);
            return;
        }

        if (speedChange < 0) this.applySpeedReductionPenalties(player, -speedChange);

        player.currentSpeed = speed;
        this.requiredSteps = speed / 20;

        if (this.requiredSteps === 0) {
            this.finalizeMove();
            return;
        }

        this.availableSpaces = this.findSelectableSpaces(player.currentPosition, false);
        this.phase = 'moving';
        this.updateUI();
    }

    private confirmMove = (): void => {
        if (this.stepSpaces.length === this.requiredSteps || this.isBaulked()) {
            if (this.isBaulked()) {
                if (!this.handleBaulking()) return;
            }
            this.phase = 'penalty';
            this.handleCornering();
        }
    }

    private finalizeMove(): void {
        const player = this.players[this.currentPlayerIndex];
        if (this.stepSpaces.length > 0) {
            const finalPosition = this.stepSpaces[this.stepSpaces.length - 1];

            if (this.didCrossFinishLine(player.currentPosition, finalPosition)) {
                player.lapsRemaining--;
                if (player.lapsRemaining === 0) {
                    this.message.setText(`${player.name} has finished the race!`);
                }
            }

            const playerPitStop = this.pitStopMap[player.id];
            if (finalPosition.i === playerPitStop.i && finalPosition.j === playerPitStop.j) {
                this.message.setText(`${player.name} made a pit stop!`);
                player.brakeWear = 0;
                player.tyreWear = 0;
            }

            player.currentPosition = finalPosition;
            this.placePlayerOnTrack(player.id, finalPosition);
        }

        this.stepSpaces = [];
        this.availableSpaces = [];
        this.selectedHighlightCircles.forEach(c => c.destroy());
        this.selectedHighlightCircles = [];
        this.phase = 'moved';
        this.startMove();
    }

    // ================================================================================================================
    // PLAYER ACTIONS & INPUT HANDLING
    // ================================================================================================================

    private handlePointerMove(pointer: Phaser.Input.Pointer): void {
        if (this.phase !== 'moving' || this.stepSpaces.length === this.requiredSteps) {
            this.hoverHighlightCircle?.destroy();
            this.hoverHighlightCircle = null;
            return;
        }
        const localPointerPos = this.getLocalPointerPosition(pointer);
        const closest = this.findNearestValidSpace(localPointerPos);

        if (this.hoveredSpace?.i === closest?.i && this.hoveredSpace?.j === closest?.j) return;
        this.hoverHighlightCircle?.destroy();
        this.hoverHighlightCircle = null;
        this.hoveredSpace = closest;
        if (closest && this.isSpaceAvailable(closest) && this.getOccupyingPlayerId(closest.i, closest.j) === null) {
            this.createHoverHighlight(closest);
        }
    }

    private handlePointerDown(pointer: Phaser.Input.Pointer): void {
        if (this.phase !== 'moving') return;
        const localPointerPos = this.getLocalPointerPosition(pointer);
        const closest = this.findNearestValidSpace(localPointerPos);
        if (!closest) return;

        const lastStep = this.stepSpaces[this.stepSpaces.length - 1];
        if (lastStep?.i === closest.i && lastStep?.j === closest.j) {
            this.deselectLastSpace();
        } else if (this.stepSpaces.length < this.requiredSteps && this.isSpaceAvailable(closest) && this.getOccupyingPlayerId(closest.i, closest.j) === null) {
            this.selectSpace(closest);
        }
        this.updateUI();
    }

    private selectSpace(space: { i: number, j: number }): void {
        this.createSelectedHighlight(space);
        this.stepSpaces.push(space);
        this.availableSpaces = this.findSelectableSpaces(space, false);
    }

    private deselectLastSpace(): void {
        this.selectedHighlightCircles.pop()?.destroy();
        this.stepSpaces.pop();
        const prev = this.stepSpaces[this.stepSpaces.length - 1] || this.players[this.currentPlayerIndex].currentPosition;
        this.availableSpaces = this.findSelectableSpaces(prev, false);
    }

    // ================================================================================================================
    // GAME RULES & MECHANICS
    // ================================================================================================================

    private applySpeedReductionPenalties(player: Player, reduction: number): void {
        if (reduction <= 20) return;

        let brakeWearIncurred = 0;
        let tyreWearIncurred = 0;

        if (reduction <= 40) brakeWearIncurred = 1;
        else if (reduction <= 60) brakeWearIncurred = 2;
        else if (reduction <= 80) { brakeWearIncurred = 3; tyreWearIncurred = 1; }
        else if (reduction <= 100) { brakeWearIncurred = 4; tyreWearIncurred = 2; }

        player.brakeWear = Math.min(player.brakeWear + brakeWearIncurred, MAX_BRAKE_WEAR);
        player.tyreWear = Math.min(player.tyreWear + tyreWearIncurred, MAX_TYRE_WEAR);
    }

    private handleCornering(): void {
        this.cornersToResolve = this.stepSpaces.filter(space => (this.getTopography(space.i, space.j) ?? 0) > TrackSpaceType.SPIN_OFF_ZONE);
        this.processNextCorner();
    }

    private handleBaulking(): boolean {
        const player = this.players[this.currentPlayerIndex];
        const lastPos = this.stepSpaces[this.stepSpaces.length - 1] || player.currentPosition;
        const baulkedSpaces = this.findSelectableSpaces(lastPos, true);
        const blockingPlayerId = this.getOccupyingPlayerId(baulkedSpaces[0].i, baulkedSpaces[0].j);
        const blockingPlayer = this.players.find(p => p.id === blockingPlayerId);

        if (blockingPlayer) {
            if (player.currentSpeed > blockingPlayer.currentSpeed) {
                const speedReduction = player.currentSpeed - blockingPlayer.currentSpeed;
                if (player.brakeWear >= MAX_BRAKE_WEAR && speedReduction > 20) {
                    this.message.setText('Baulked with max brakes! Forced to spin off.');
                    this.spinOff(player, lastPos);
                    return false; // Spin-off occurred, stop further processing
                }
                this.applySpeedReductionPenalties(player, speedReduction);
                player.currentSpeed = blockingPlayer.currentSpeed;
                this.message.setText(`Baulked! Speed reduced to ${player.currentSpeed}.`);
            } else if (player.currentSpeed < blockingPlayer.currentSpeed) {
                const speedIncrease = blockingPlayer.currentSpeed - player.currentSpeed;
                if (speedIncrease <= 60) {
                    player.currentSpeed = blockingPlayer.currentSpeed;
                    this.message.setText(`Baulked! Speed matched to ${player.currentSpeed}.`);
                }
            }
        }
        return true; // No spin-off, proceed with turn
    }

    private processNextCorner(): void {
        if (this.cornersToResolve.length === 0) {
            this.finalizeMove();
            return;
        }

        // Reset dice for the new corner
        this.die1Result = null;
        this.die2Result = null;
        this.die1Text.setText('?');
        this.die2Text.setText('?');

        const corner = this.cornersToResolve.shift()!;
        const player = this.players[this.currentPlayerIndex];
        const safetySpeed = this.getTopography(corner.i, corner.j) ?? 0;
        const excessSpeed = player.currentSpeed - safetySpeed;

        if (excessSpeed <= 0) {
            this.processNextCorner(); // Safe, move to the next corner immediately
            return;
        }

        if (excessSpeed >= 60 || player.tyreWear >= MAX_TYRE_WEAR) {
            this.spinOff(player, corner);
            return;
        }

        this.cornerPenaltyContext = { player, excessSpeed, corner };
        this.phase = 'penalty';
        this.updateUI();
    }

    private rollDie(die: 1 | 2): void {
        if (this.phase !== 'penalty') return;
        const roll = Phaser.Math.Between(1, 6);
        if (die === 1 && this.die1Result === null) {
            this.die1Result = roll;
            this.die1Text.setText(String(roll));
        } else if (die === 2 && this.die2Result === null) {
            this.die2Result = roll;
            this.die2Text.setText(String(roll));
        }

        if (this.die1Result !== null && this.die2Result !== null) {
            this.calculatePenalty(this.die1Result, this.die2Result);
        }
    }

    private calculatePenalty(d1: number, d2: number): void {
        if (!this.cornerPenaltyContext) return;
        const { player, excessSpeed, corner } = this.cornerPenaltyContext;
        const roll = d1 + d2;
        const penaltyKey: '20' | '40' = excessSpeed > 20 ? '40' : '20';

        let penaltyLookupKey = String(roll);
        if (d1 === d2) {
            const doublesKey = `${roll}d`;
            if (this.trackData.penaltyChart[penaltyKey][doublesKey]) {
                penaltyLookupKey = doublesKey;
            }
        }

        const penalty = this.trackData.penaltyChart[penaltyKey][penaltyLookupKey];

        let penaltyMessage = `Rolled ${roll}. No penalty.`;

        if (penalty) {
            if (penalty.message) {
                penaltyMessage = `Rolled ${roll}. ${penalty.message}`;
            }

            if (penalty.spinOffIfTyreWear4 && player.tyreWear >= 4) {
                this.message.setText(`Rolled ${roll}. Tyre wear >= 4. Spin Off!`);
                this.spinOff(player, corner);
                return;
            }

            if (penalty.tyreWear) {
                if (player.tyreWear >= MAX_TYRE_WEAR) {
                    this.message.setText(`Rolled ${roll}. Max tyre wear! Spin Off!`);
                    this.spinOff(player, corner);
                    return;
                }
                player.tyreWear = Math.min(player.tyreWear + penalty.tyreWear, MAX_TYRE_WEAR);
            }
            if (penalty.brakeWear) {
                player.brakeWear = Math.min(player.brakeWear + penalty.brakeWear, MAX_BRAKE_WEAR);
            }

            if (penalty.spinOff) {
                this.message.setText(`Rolled ${roll}. Spin Off!`);
                this.spinOff(player, corner);
                return;
            }
        }

        this.message.setText(penaltyMessage);
        this.updateUI(); // Update wear gauges immediately
        this.time.delayedCall(1500, this.processNextCorner, [], this);
    }

    private spinOff(player: Player, cornerPosition: { i: number, j: number }): void {
        this.message.setText(`${player.name} spun off!`);
        player.currentSpeed = 0;
        const spinOffSpace = this.findNearestSpinOffSpace(cornerPosition);
        if (spinOffSpace) {
            player.currentPosition = spinOffSpace;
            this.placePlayerOnTrack(player.id, spinOffSpace);
        }

        this.cornersToResolve = []; // Clear any remaining corners
        this.time.delayedCall(1500, () => {
            this.stepSpaces = [];
            this.availableSpaces = [];
            this.selectedHighlightCircles.forEach(c => c.destroy());
            this.selectedHighlightCircles = [];
            this.phase = 'moved';
            this.startMove();
        }, [], this);
    }


    // ================================================================================================================
    // UI & VISUALS
    // ================================================================================================================

    private updateUI(): void {
        const player = this.players[this.currentPlayerIndex];
        this.lapText.setText(`${this.numLaps - player.lapsRemaining + 1} / ${this.numLaps}`);
        this.tyreWearText.setText(`${player.tyreWear}`);
        this.brakeWearText.setText(`${player.brakeWear}`);
        this.tyreWearBar.setProgress(player.tyreWear / MAX_TYRE_WEAR);
        this.brakeWearBar.setProgress(player.brakeWear / MAX_BRAKE_WEAR);

        this.die1Widget.getContainer().setVisible(this.phase === 'penalty');
        this.die2Widget.getContainer().setVisible(this.phase === 'penalty');
        if (this.phase !== 'penalty') {
            this.die1Result = null;
            this.die2Result = null;
            this.die1Text.setText('?');
            this.die2Text.setText('?');
            this.cornerPenaltyContext = null;
        }

        switch (this.phase) {
            case 'speedselect':
                this.message.setText(`${player.name}, select your speed.`);
                this.confirmMoveButton.getContainer().setVisible(false);
                break;
            case 'moving':
                const isBaulked = this.isBaulked();
                if (this.stepSpaces.length === this.requiredSteps || isBaulked) {
                    const message = isBaulked ? 'You are baulked! Confirm move.' : 'Confirm your move or click the last space to undo.';
                    this.message.setText(message);
                    this.confirmMoveButton.getContainer().setVisible(true);
                } else {
                    this.message.setText(`Selected ${this.stepSpaces.length} of ${this.requiredSteps} spaces.`);
                    this.confirmMoveButton.getContainer().setVisible(false);
                }
                break;
            case 'penalty':
                const cornerNum = this.stepSpaces.filter(s => (this.getTopography(s.i, s.j) ?? 0) > TrackSpaceType.SPIN_OFF_ZONE).length - this.cornersToResolve.length;
                this.message.setText(`Corner ${cornerNum}: Exceeded safety speed! Roll the dice.`);
                this.confirmMoveButton.getContainer().setVisible(false);
                break;
        }
    }

    private createHoverHighlight(space: { i: number, j: number }): void {
        const coords = this.getCoordinates(space.i, space.j);
        if (!coords) return;
        const pos = this.trackImageToContainer(coords.x, coords.y);
        this.hoverHighlightCircle = this.add.circle(pos.x, pos.y, this.selectionCircleRadius, 0xffff00, 0.5).setDepth(100);
        this.gameContainer.add(this.hoverHighlightCircle);
    }

    private createSelectedHighlight(space: { i: number, j: number }): void {
        const coords = this.getCoordinates(space.i, space.j);
        if (!coords) return;
        const pos = this.trackImageToContainer(coords.x, coords.y);
        const toHighlight = this.add.circle(pos.x, pos.y, this.selectionCircleRadius, 0x00ff00, 0.5).setDepth(1000);
        this.gameContainer.add(toHighlight);
        this.selectedHighlightCircles.push(toHighlight);
    }

    private placePlayerOnTrack(playerId: number, pos: { i: number, j: number }): void {
        const playerImage = this.playerImages[playerId];
        if (!playerImage) return;
        const cell = this.trackData.coordinates[pos.i]?.[pos.j];
        if (!cell) return;
        const { x, y } = this.trackImageToContainer(cell[0], cell[1]);
        playerImage.setPosition(x, y);
        const coords = this.getCoordinates(pos.i, pos.j);
        if (!coords) return;
        const nextJ = (pos.j + 1) % this.trackData.coordinates[pos.i].length;
        const nextPosCoords = this.getCoordinates(pos.i, nextJ);
        if (!nextPosCoords) return;
        const angleRad = Math.atan2(nextPosCoords.y - coords.y, nextPosCoords.x - coords.x);
        playerImage.setAngle(Phaser.Math.RadToDeg(angleRad) + 180);
    }

    // ================================================================================================================
    // HELPER & UTILITY METHODS
    // ================================================================================================================

    private getLocalPointerPosition(pointer: Phaser.Input.Pointer): { x: number, y: number } {
        const local = new Phaser.Math.Vector2();
        this.gameContainer.getWorldTransformMatrix().invert().transformPoint(pointer.x, pointer.y, local);
        return { x: local.x, y: local.y };
    }

    private isSpaceAvailable(space: { i: number, j: number }): boolean {
        return this.availableSpaces.some(s => s.i === space.i && s.j === space.j);
    }

    private isBaulked(): boolean {
        const lastPos = this.stepSpaces[this.stepSpaces.length - 1] || this.players[this.currentPlayerIndex].currentPosition;
        const available = this.findSelectableSpaces(lastPos, true);
        return available.length > 0 && available.every(s => this.getOccupyingPlayerId(s.i, s.j) !== null);
    }

    private findNearestValidSpace(pos: { x: number, y: number }): { i: number, j: number } | null {
        let closest: { i: number, j: number } | null = null;
        let closestDist = Infinity;
        for (let i = 0; i < this.trackData.coordinates.length; i++) {
            for (let j = 0; j < this.trackData.coordinates[i].length; j++) {
                if (!this.trackData.coordinates[i][j]) continue;
                const coords = this.getCoordinates(i, j)!;
                const posOnContainer = this.trackImageToContainer(coords.x, coords.y);
                const dist = Phaser.Math.Distance.Between(pos.x, pos.y, posOnContainer.x, posOnContainer.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = { i, j };
                }
            }
        }
        return closestDist > 30 ? null : closest;
    }

    private findNearestSpinOffSpace(pos: { i: number, j: number }): { i: number, j: number } | null {
        let closest: { i: number, j: number } | null = null;
        let closestDist = Infinity;
        for (let i = 0; i < this.trackData.topography.length; i++) {
            for (let j = 0; j < this.trackData.topography[i].length; j++) {
                if (this.getTopography(i, j) === TrackSpaceType.SPIN_OFF_ZONE) {
                    const dist = Phaser.Math.Distance.Between(pos.j, pos.i, j, i);
                    if (dist < closestDist) {
                        closestDist = dist;
                        closest = { i, j };
                    }
                }
            }
        }
        return closest;
    }

    private didCrossFinishLine(startPos: { i: number, j: number }, endPos: { i: number, j: number }): boolean {
        return startPos.i > 0 && endPos.i === 0;
    }

    private trackImageToContainer(x: number, y: number): { x: number, y: number } {
        const { displayWidth, displayHeight, scaleX, scaleY, originX, originY, x: imgX, y: imgY } = this.trackImage;
        const topLeftLocalX = imgX - (originX ?? 0.5) * displayWidth;
        const topLeftLocalY = imgY - (originY ?? 0.5) * displayHeight;
        return { x: topLeftLocalX + x * scaleX, y: topLeftLocalY + y * scaleY };
    }

    getCoordinates(i: number, j: number): { x: number, y: number } | null {
        const coords = this.trackData.coordinates[i]?.[j];
        return coords ? { x: coords[0], y: coords[1] } : null;
    }

    getTopography(i: number, j: number): number | null {
        return this.trackData.topography[i]?.[j] ?? null;
    }

    private getOccupyingPlayerId(i: number, j: number): number | null {
        return this.players.find(p => p.currentPosition.i === i && p.currentPosition.j === j)?.id ?? null;
    }

    findSelectableSpaces(current: { i: number; j: number }, ignoreOccupied: boolean): { i: number; j: number }[] {
        const results: { i: number; j: number }[] = [];
        const directions = [
            { name: "F", di: 1, dj: 0, delta1: { di: 1, dj: 0 }, delta2: { di: 1, dj: 0 } },
            { name: "FL", di: 1, dj: 1, delta1: { di: 0, dj: 1 }, delta2: { di: 1, dj: -1 } },
            { name: "FR", di: 1, dj: -1, delta1: { di: 0, dj: -1 }, delta2: { di: 1, dj: 1 } }
        ];
        const isBlocking = (topo: number | null) => topo === TrackSpaceType.OUT_OF_BOUNDS || topo === TrackSpaceType.SPIN_OFF_ZONE;

        for (const dir of directions) {
            let pos = { i: (current.i + dir.di) % this.trackData.topography.length, j: current.j + dir.dj };
            let topo = this.getTopography(pos.i, pos.j);

            const isOccupied = this.getOccupyingPlayerId(pos.i, pos.j) !== null;
            if (topo === null || isBlocking(topo) || (isOccupied && !ignoreOccupied)) {
                continue;
            }
            if (topo !== TrackSpaceType.INVISIBLE_SPACE) { results.push(pos); continue; }

            pos = { i: (pos.i + dir.delta1.di) % this.trackData.topography.length, j: pos.j + dir.delta1.dj };
            topo = this.getTopography(pos.i, pos.j);
            const isOccupied2 = this.getOccupyingPlayerId(pos.i, pos.j) !== null;
            if (topo === null || isBlocking(topo) || (isOccupied2 && !ignoreOccupied)) {
                continue;
            }
            if (topo !== TrackSpaceType.INVISIBLE_SPACE) { results.push(pos); continue; }

            pos = { i: (pos.i + dir.delta2.di) % this.trackData.topography.length, j: pos.j + dir.delta2.dj };
            topo = this.getTopography(pos.i, pos.j);
            const isOccupied3 = this.getOccupyingPlayerId(pos.i, pos.j) !== null;
            if (topo !== null && !isBlocking(topo) && (!isOccupied3 || ignoreOccupied) && topo !== TrackSpaceType.INVISIBLE_SPACE) {
                results.push(pos);
            }
        }
        return results;
    }


    // ================================================================================================================
    // UI ELEMENT CREATION (HELPERS FOR setupUI)
    // ================================================================================================================

    private createLapIndicator(grid: GridContainer): void {
        const lapIndicator = new Widget({ scene: this, width: 120, height: 120, cornerRadius: 20, layout: 'vertical', padding: 8 });
        lapIndicator.addText('Lap', 18, '#ffffff');
        this.lapText = lapIndicator.addText(`1 / ${this.numLaps}`, 28, '#ffff00');
        grid.addItem(lapIndicator.getContainer(), { col: 3, row: 6, colSpan: 2, rowSpan: 2 });
    }

    private createDiceWidgets(grid: GridContainer): void {
        this.die1Widget = new HitboxWidget({ scene: this, width: 120, height: 120, cornerRadius: 20, layout: 'vertical', padding: 8 });
        this.die1Widget.addText('Dice 1', 18, '#ccc');
        this.die1Text = this.die1Widget.addText('?', 36, '#ffff00');
        this.die1Widget.onClick(() => this.rollDie(1));
        grid.addItem(this.die1Widget.getContainer(), { col: 2, row: 9, colSpan: 2, rowSpan: 2 });

        this.die2Widget = new HitboxWidget({ scene: this, width: 120, height: 120, cornerRadius: 20, layout: 'vertical', padding: 8 });
        this.die2Widget.addText('Dice 2', 18, '#ccc');
        this.die2Text = this.die2Widget.addText('?', 36, '#ffff00');
        this.die2Widget.onClick(() => this.rollDie(2));
        grid.addItem(this.die2Widget.getContainer(), { col: 4, row: 9, colSpan: 2, rowSpan: 2 });
    }

    private createWearIndicators(grid: GridContainer): void {
        const tireWidget = new Widget({ scene: this, width: 240, height: 120, cornerRadius: 20, layout: 'vertical', padding: 8 });
        tireWidget.addText('Tire Wear', 16, '#fff');
        this.tyreWearText = tireWidget.addText('0', 16, '#ffff00');
        this.tyreWearBar = tireWidget.addProgressBar(0);
        grid.addItem(tireWidget.getContainer(), { col: 2, row: 14, colSpan: 4, rowSpan: 2 });

        const brakeWidget = new Widget({ scene: this, width: 240, height: 120, cornerRadius: 20, layout: 'vertical', padding: 8 });
        brakeWidget.addText('Brake Wear', 16, '#fff');
        this.brakeWearText = brakeWidget.addText('0', 16, '#ffff00');
        this.brakeWearBar = brakeWidget.addProgressBar(0);
        grid.addItem(brakeWidget.getContainer(), { col: 26, row: 14, colSpan: 4, rowSpan: 2 });
    }

    private createSpeedSelector(grid: GridContainer): void {
        const speedWidget = new HitboxWidget({ scene: this, width: 1080, height: 120, cornerRadius: 20, layout: 'horizontal', padding: 8 });
        for (let speed = 0; speed <= 160; speed += 20) {
            speedWidget.addText(`${speed}`, 24, '#ffffff', () => this.selectSpeed(speed));
        }
        grid.addItem(speedWidget.getContainer(), { col: 7, row: 14, colSpan: 18, rowSpan: 2 });
    }

    private createMessageBox(grid: GridContainer): void {
        const messageBox = new Widget({ scene: this, width: 500, height: 60, layout: 'horizontal', padding: 8, backgroundAlpha: 0 });
        this.message = messageBox.addText("", 24, '#ffff00');
        messageBox.getContainer().setDepth(99);
        grid.addItem(messageBox.getContainer(), { col: 13, row: 17, colSpan: 7, rowSpan: 1 });
    }

    private createConfirmMoveButton(grid: GridContainer): void {
        this.confirmMoveButton = new HitboxWidget({ scene: this, width: 240, height: 60, cornerRadius: 20, layout: 'horizontal', padding: 8 });
        this.confirmMoveButton.addText('Confirm Move', 24, '#ffffff');
        this.confirmMoveButton.onClick(this.confirmMove);
        this.confirmMoveButton.getContainer().setVisible(false);
        grid.addItem(this.confirmMoveButton.getContainer(), { col: 15, row: 7, colSpan: 4, rowSpan: 1 });
    }
}
