export class Player {
    id: number;
    currentPosition: { x: number, y: number };

    constructor(id: number, startPosition: [number, number]) {
        this.id = id;
        this.currentPosition = { x: startPosition[0], y: startPosition[1] };
    }
}