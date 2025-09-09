export class Player {
    id: number;
    name: string;
    roll: number;
    rollOrder: number;
    currentPosition: { i: number, j: number };
    currentSpeed: number;
    currentLap: number;

    constructor(id: number) {
        this.id = id;
    }
}