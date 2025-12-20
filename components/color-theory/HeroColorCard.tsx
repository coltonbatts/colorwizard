import { getPainterValue, getPainterChroma, getContrastColor } from '@/lib/paintingMath';

interface HeroColorCardProps {
    targetColor: string; // CSS string
    mixColor: string;    // CSS string
}

export default function HeroColorCard({ targetColor, mixColor }: HeroColorCardProps) {
    const targetValue = getPainterValue(targetColor);
    const targetChroma = getPainterChroma(targetColor);
    const targetText = getContrastColor(targetColor);

    const mixValue = getPainterValue(mixColor);
    const mixChroma = getPainterChroma(mixColor);
    const mixText = getContrastColor(mixColor);

    return (
        <div className="grid grid-cols-2 gap-4 w-full h-48 mb-6">
            {/* Target Card */}
            <div
                className="rounded-2xl shadow-lg relative flex flex-col justify-end p-6 transition-all ring-1 ring-white/10"
                style={{ backgroundColor: targetColor, color: targetText }}
            >
                <div className="absolute top-4 left-4 text-xs font-bold tracking-wider opacity-70 uppercase">
                    Target
                </div>
                <div>
                    <div className="text-4xl font-bold mb-1">{targetValue}</div>
                    <div className="text-sm font-medium opacity-90">Value</div>
                </div>
                <div className="mt-4">
                    <div className="text-lg font-bold">{targetChroma.label}</div>
                    <div className="text-xs opacity-75">{targetChroma.value.toFixed(3)} C</div>
                </div>
            </div>

            {/* Mix Card */}
            <div
                className="rounded-2xl shadow-lg relative flex flex-col justify-end p-6 transition-all ring-1 ring-white/10"
                style={{ backgroundColor: mixColor, color: mixText }}
            >
                <div className="absolute top-4 left-4 text-xs font-bold tracking-wider opacity-70 uppercase flex items-center gap-2">
                    <span>Your Mix</span>
                    {targetColor === mixColor && (
                        <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">Exact Match</span>
                    )}
                </div>
                <div>
                    <div className="text-4xl font-bold mb-1">{mixValue}</div>
                    <div className="text-sm font-medium opacity-90">Value</div>
                </div>
                <div className="mt-4">
                    <div className="text-lg font-bold">{mixChroma.label}</div>
                    <div className="text-xs opacity-75">{mixChroma.value.toFixed(3)} C</div>
                </div>
            </div>
        </div>
    );
}
