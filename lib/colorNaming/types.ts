export type ColorSource = 'css' | 'xkcd' | 'extended';

export interface ColorNameMatch {
    name: string;
    matchedHex: string;
    distance: number;
    source: ColorSource;
}

export interface GetColorNameOptions {
    source?: ColorSource;
}
