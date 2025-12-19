import { getPainterValue, getPainterChroma } from '@/lib/paintingMath';

interface ValueChromaMapProps {
    targetColor: string;
    mixColor: string;
    theme?: 'dark' | 'light';
}

export default function ValueChromaMap({ targetColor, mixColor }: ValueChromaMapProps) {
    // Calculate coordinates
    // X: Chroma (0-0.4 mapped to 0-100%)
    // Y: Value (0-10 mapped to 0-100%, 10 is top)

    const getCoords = (c: string) => {
        const value = getPainterValue(c); // 0-10
        const chromaObj = getPainterChroma(c);
        const chromaVal = Math.min(0.4, chromaObj.value); // 0-0.4

        return {
            x: (chromaVal / 0.4) * 100, // 0-100%
            y: 100 - (value / 10) * 100 // 0-100% (inverted for SVG y-axis)
        };
    };

    const targetPos = getCoords(targetColor);
    const mixPos = getCoords(mixColor);

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mt-6">
            <h3 className="text-sm font-medium text-white mb-4">Value-Chroma Map</h3>

            <div className="relative w-full aspect-square bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
                {/* Labels */}
                <div className="absolute top-2 left-2 text-[10px] text-gray-500">High Value (Light)</div>
                <div className="absolute bottom-2 left-2 text-[10px] text-gray-500">Low Value (Dark)</div>
                <div className="absolute bottom-2 right-2 text-[10px] text-gray-500">Vivid</div>
                <div className="absolute bottom-2 left-10 text-[10px] text-gray-500">Muted</div>

                {/* Grid Lines */}
                <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-10 pointer-events-none">
                    {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} className="border border-white/20" />
                    ))}
                </div>

                <svg className="w-full h-full absolute inset-0 pointer-events-none">
                    {/* Arrow from Target to Mix (optional, or just show move arrows from mix) 
                         The requirement: "Draw three arrows from Mix: +White, +Complement, +Darken"
                         But we are plotting Target AND Mix. 
                         If Mix == Target, arrows originate from there.
                     */}

                    <defs>
                        <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="0" refY="2" orient="auto">
                            <polygon points="0 0, 6 2, 0 4" fill="#9CA3AF" />
                        </marker>
                    </defs>

                    {/* Guideline Arrows from Mix Point */}
                    {/* +White (Up and Left usually, as white is low chroma high value) */}
                    {/* Actually let's just draw static indicators or small vectors from the mix point */}

                    <line
                        x1={`${mixPos.x}%`} y1={`${mixPos.y}%`}
                        x2={`${mixPos.x * 0.8}%`} y2={`${Math.max(0, mixPos.y - 15)}%`}
                        stroke="#60A5FA" strokeWidth="1.5" strokeDasharray="3,3"
                        markerEnd="url(#arrowhead)"
                    />
                    <text x={`${mixPos.x * 0.8}%`} y={`${Math.max(5, mixPos.y - 16)}%`} fontSize="8" fill="#60A5FA" textAnchor="middle">+White</text>

                    {/* +Black (Down) */}
                    <line
                        x1={`${mixPos.x}%`} y1={`${mixPos.y}%`}
                        x2={`${mixPos.x * 0.9}%`} y2={`${Math.min(100, mixPos.y + 15)}%`}
                        stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="3,3"
                        markerEnd="url(#arrowhead)"
                    />
                    <text x={`${mixPos.x * 0.9}%`} y={`${Math.min(95, mixPos.y + 18)}%`} fontSize="8" fill="#9CA3AF" textAnchor="middle">+Black</text>

                    {/* +Neutral (Left) */}
                    <line
                        x1={`${mixPos.x}%`} y1={`${mixPos.y}%`}
                        x2={`${Math.max(0, mixPos.x - 15)}%`} y2={`${mixPos.y}%`}
                        stroke="#FBBF24" strokeWidth="1.5" strokeDasharray="3,3"
                        markerEnd="url(#arrowhead)"
                    />
                    <text x={`${Math.max(5, mixPos.x - 16)}%`} y={`${mixPos.y - 2}%`} fontSize="8" fill="#FBBF24" textAnchor="end">+Comp</text>

                    {/* Target Point */}
                    <circle cx={`${targetPos.x}%`} cy={`${targetPos.y}%`} r="6" fill={targetColor} stroke="white" strokeWidth="2" />

                    {/* Mix Point */}
                    <circle cx={`${mixPos.x}%`} cy={`${mixPos.y}%`} r="6" fill={mixColor} stroke="white" strokeWidth="2" strokeDasharray="2,1" />
                </svg>
            </div>
        </div>
    );
}
