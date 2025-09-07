export class Player {
    id: number;
    currentPosition: { i: number, j: number };

    constructor(id: number, startPosition: [number, number]) {
        this.id = id;
        this.currentPosition = { i: startPosition[0], j: startPosition[1] };
    }
}