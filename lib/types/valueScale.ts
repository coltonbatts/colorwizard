import { ValueScaleMode, ClipPercent } from '../valueScale';

export interface ValueScaleSettings {
    enabled: boolean;
    steps: number;
    mode: ValueScaleMode;
    clip: ClipPercent;
}

export const DEFAULT_VALUE_SCALE_SETTINGS: ValueScaleSettings = {
    enabled: false,
    steps: 5,
    mode: 'Even',
    clip: 0,
};
