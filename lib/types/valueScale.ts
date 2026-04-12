import { ValueScaleMode, ClipPercent } from '../valueScale';

export interface ValueScaleSettings {
    enabled: boolean;
    steps: number;
    mode: ValueScaleMode;
    clip: ClipPercent;
    opacity: number;  // 0..1, overlay opacity for alpha blending
}

export const DEFAULT_VALUE_SCALE_SETTINGS: ValueScaleSettings = {
    enabled: false,
    steps: 7,         // Default 7 steps
    mode: 'Even',
    clip: 0,          // Full-range remap for discrete painterly value studies
    opacity: 0.45,    // Default 45% opacity
};
