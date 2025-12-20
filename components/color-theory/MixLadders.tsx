import { useMemo } from 'react';
import { mixColors, getComplementaryColor, rotateHue } from '@/lib/paintingMath';

export interface MixState {
    white: number;      // 0-1
    complement: number; // 0-1
    black: number;      // 0-1
    hue: number;        // -180 to 180 (degrees)
    saturation: number; // 0-3 (1 = normal)
}

interface MixLaddersProps {
    targetColor: string;
    mixState: MixState;
    onChange: (newState: MixState) => void;
}

export default function MixLadders({ targetColor, mixState, onChange }: MixLaddersProps) {

    // Base color for ladders needs to reflect the Hue Shift first?
    // User wants "Your Mix" options.
    // If we shift Hue, the "Tint" ladder should probably tint the *Shifted* color.
    // So let's calculate a shifted base.
    const shiftedBase = useMemo(() => rotateHue(targetColor, mixState.hue), [targetColor, mixState.hue]);
    const shiftedComplement = useMemo(() => getComplementaryColor(shiftedBase), [shiftedBase]);

    // Generate steps for visualization
    const steps = 5;

    // Tint Ladder (Shifted -> White)
    const tintSteps = Array.from({ length: steps }).map((_, i) => ({
        color: mixColors(shiftedBase, '#ffffff', i / (steps - 1)),
        label: i === 0 ? 'Pure' : i === steps - 1 ? 'White' : ''
    }));

    // Neutralize Ladder (Shifted -> Complement)
    const toneSteps = Array.from({ length: steps }).map((_, i) => ({
        color: mixColors(shiftedBase, shiftedComplement, i / (steps - 1)),
        label: i === 0 ? 'Pure' : i === steps - 1 ? 'Comp.' : ''
    }));

    // Shade Ladder (Shifted -> Black)
    const shadeSteps = Array.from({ length: steps }).map((_, i) => ({
        color: mixColors(shiftedBase, '#000000', i / (steps - 1)),
        label: i === 0 ? 'Pure' : i === steps - 1 ? 'Black' : ''
    }));

    return (
        <div className="space-y-6">
            {/* Hue Shift Control */}
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-white">Hue Shift</label>
                    <span className="text-xs text-green-300">{mixState.hue > 0 ? `+${mixState.hue}°` : `${mixState.hue}°`}</span>
                </div>
                <input
                    type="range"
                    min="-180" max="180"
                    value={mixState.hue}
                    onChange={(e) => onChange({ ...mixState, hue: Number(e.target.value) })}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mb-4 accent-green-500"
                />
                <div className="flex justify-between text-[10px] text-gray-500 px-1">
                    <span>-180°</span>
                    <span>0°</span>
                    <span>+180°</span>
                </div>
            </div>

            {/* Saturation Boost */}
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-white">Saturation</label>
                    <span className="text-xs text-pink-300">{(mixState.saturation * 100).toFixed(0)}%</span>
                </div>
                <input
                    type="range"
                    min="0" max="300"
                    value={mixState.saturation * 100}
                    onChange={(e) => onChange({ ...mixState, saturation: Number(e.target.value) / 100 })}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mb-4 accent-pink-500"
                />
                <div className="flex justify-between text-[10px] text-gray-500 px-1">
                    <span>0% (Gray)</span>
                    <span>100% (Normal)</span>
                    <span>300% (Boost)</span>
                </div>
            </div>

            {/* Tint Control */}
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-white">Tint (Add White)</label>
                    <span className="text-xs text-blue-300">Raises Value</span>
                </div>
                <input
                    type="range"
                    min="0" max="100"
                    value={mixState.white * 100}
                    onChange={(e) => onChange({ ...mixState, white: Number(e.target.value) / 100 })}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mb-4 accent-white"
                />
                <div className="flex height-8 rounded-lg overflow-hidden border border-gray-600">
                    {tintSteps.map((s, i) => (
                        <div key={i} className="flex-1 h-8 bg-gray-600" style={{ backgroundColor: s.color }} title={s.label} />
                    ))}
                </div>
            </div>

            {/* Neutralize Control */}
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-white">Neutralize (Add Complement)</label>
                    <span className="text-xs text-yellow-300">Lowers Chroma</span>
                </div>
                <input
                    type="range"
                    min="0" max="100"
                    value={mixState.complement * 100}
                    onChange={(e) => onChange({ ...mixState, complement: Number(e.target.value) / 100 })}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mb-4 accent-amber-500"
                />
                <div className="flex height-8 rounded-lg overflow-hidden border border-gray-600">
                    {toneSteps.map((s, i) => (
                        <div key={i} className="flex-1 h-8 bg-gray-600" style={{ backgroundColor: s.color }} title={s.label} />
                    ))}
                </div>
            </div>

            {/* Shade Control */}
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-white">Shade (Add Black)</label>
                    <span className="text-xs text-purple-300">Detailed Darkening</span>
                </div>
                <input
                    type="range"
                    min="0" max="100"
                    value={mixState.black * 100}
                    onChange={(e) => onChange({ ...mixState, black: Number(e.target.value) / 100 })}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mb-4 accent-gray-900"
                />
                <div className="flex height-8 rounded-lg overflow-hidden border border-gray-600">
                    {shadeSteps.map((s, i) => (
                        <div key={i} className="flex-1 h-8 bg-gray-600" style={{ backgroundColor: s.color }} title={s.label} />
                    ))}
                </div>
            </div>
        </div>
    );
}
