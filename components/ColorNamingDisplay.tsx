'use client';

import { useState, useEffect } from 'react';
import { getColorName } from '@/lib/colorNaming';
import { ColorNameMatch, ColorSource } from '@/lib/colorNaming/types';
import { getMatchConfidence } from '@/lib/colorUtils';

interface ColorNamingDisplayProps {
    hex: string;
}

export default function ColorNamingDisplay({ hex }: ColorNamingDisplayProps) {
    const [source, setSource] = useState<ColorSource>('extended');
    const [match, setMatch] = useState<ColorNameMatch | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState<'name' | 'hex' | null>(null);

    useEffect(() => {
        let active = true;
        const fetchName = async () => {
            setMatch(null);
            setLoading(true);
            try {
                const result = await getColorName(hex, { source });
                if (active) {
                    setMatch(result);
                }
            } catch (err) {
                console.error('Failed to get color name:', err);
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        fetchName();
        return () => { active = false; };
    }, [hex, source]);

    const confidence = match ? getMatchConfidence(match.distance) : null;

    const copyToClipboard = (text: string, type: 'name' | 'hex') => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="w-full flex flex-col gap-3 p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-[10px] text-studio-dim uppercase font-black tracking-widest mb-1">Color Name</span>
                    <div className="flex items-center gap-2">
                        <h3 className={`text-xl lg:text-2xl font-black text-studio tracking-tight ${loading ? 'opacity-50' : 'opacity-100'} transition-opacity truncate max-w-[200px]`}>
                            {loading ? 'Finding...' : match?.name || 'Unknown'}
                        </h3>
                        {match && !loading && (
                            <button
                                onClick={() => copyToClipboard(match.name, 'name')}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-studio-muted hover:text-studio group relative"
                                title="Copy Name"
                            >
                                {copied === 'name' ? '✅' : '📋'}
                                {copied === 'name' && (
                                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-studio text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                        Copied!
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-studio-dim uppercase font-black tracking-widest mb-1">Database</span>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-gray-100 px-2 py-1 rounded-lg">
                        Extended
                    </span>
                </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-1">
                <div className="flex items-center gap-2">
                    {confidence && (
                        <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${confidence.bgColor} animate-pulse`}></div>
                            <span className={`text-[11px] font-bold uppercase tracking-tight ${confidence.color}`}>
                                {confidence.label}
                            </span>
                            <span className="text-[10px] text-studio-muted font-mono">
                                (ΔE: {match?.distance.toFixed(1)})
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1 bg-studio/5 px-2 py-1 rounded-lg border border-studio/10">
                    <span className="font-mono text-xs font-bold text-studio/60 uppercase">{hex}</span>
                    <button
                        onClick={() => copyToClipboard(hex, 'hex')}
                        className="p-1 hover:bg-studio/10 rounded transition-colors text-studio/40 hover:text-studio group relative"
                        title="Copy Hex"
                    >
                        {copied === 'hex' ? '✅' : '📋'}
                    </button>
                </div>
            </div>

            {source === 'extended' && !loading && match && (
                <p className="text-[9px] text-studio-muted text-right italic">
                    Extended dataset powered by meodai/color-names
                </p>
            )}
        </div>
    );
}
