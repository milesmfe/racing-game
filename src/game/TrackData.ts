export enum TrackSpaceType {
    NORMAL = 1,
    OUT_OF_BOUNDS = 0,
    SPIN_OFF_ZONE = -1,
    INVISIBLE_SPACE = -2,
}

// Defines a potential override for a penalty, e.g., for double dice rolls.
interface PenaltyOverride {
    dieValue: number;
    message: string;
}

// Defines the structure of a penalty for a given dice roll.
interface Penalty {
    tyreWear?: number;
    brakeWear?: number;
    spinOff?: boolean;
    spinOffIfTyreWear4?: boolean;
    message?: string;
    doublesOverride?: PenaltyOverride;
}

// Defines a lookup table for penalties, indexed by a string (the dice roll).
interface PenaltyChartLevel {
    [key: string]: Penalty | undefined;
}

// The main interface for the track data JSON file.
export interface TrackData {
    coordinates: ([number, number] | null)[][];
    topography: number[][];
    penaltyChart: {
        '20': PenaltyChartLevel;
        '40': PenaltyChartLevel;
    };
}
