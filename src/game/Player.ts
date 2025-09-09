export class Player {
    id: number;
    name: string = "Player";
    roll: number = 0;
    rollOrder: number = 0;
    currentPosition: { i: number, j: number };
    currentSpeed: number = 60;

    constructor(id: number) {
        this.id = id;
    }
}