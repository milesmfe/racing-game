import { Scene } from 'phaser';
import { GameSetup } from '../GameSetup';
import { Player } from '../Player';

export class GameScene extends Scene {
    private players: Player[];
    private numLaps: number;

    constructor() {
        super('GameScene');
    }

    preload() { }

    create(data?: GameSetup) {
        if (!data) throw new Error('GameScene initialized without game setup data.');
        this.players = data.players;
        this.numLaps = data.numLaps;
        console.log(`GameScene initialized with players: ${this.players.length}, laps: ${this.numLaps}`);

    }
}