export interface TrackData {
    topography: number[][];
    coordinates: [number, number][][];
    spinOffPoints: { x: number; y: number }[];
}

export enum TrackSpaceType {
    NORMAL_SPACE = 0,
    INVISIBLE_SPACE = 1,
    OUT_OF_BOUNDS = 2,
    STARTING_GRID = 3,
    FINISH_LINE = 4,
    PIT_SPACE = 5,
    SPIN_OFF_ZONE = 6,
}