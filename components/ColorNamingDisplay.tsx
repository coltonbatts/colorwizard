'use client';

import { useState, useEffect } from 'react';
import { getColorName } from '@/lib/colorNaming';
import { ColorNameMatch, ColorSource } from '@/lib/colorNaming/types';
import { getCatalogMatchPresentation } from '@/lib/colorSemantics';

interface ColorNamingDisplayProps {
    hex: string;
}

export default function ColorNamingDisplay({ hex }: ColorNamingDisplayProps) {
    const [source] = useState<ColorSource>('extended');
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

    const confidence = match ? getCatalogMatchPresentation(match.distance) : null;

    const copyToClipboard = (text: string, type: 'name' | 'hex') => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <section className="color-name-panel" aria-label="Perceptual color name">
            <div className="flex items-center justify-between">
                <div className="flex flex-col flex-1 min-w-0">
                    <span className="studio-section-label mb-1">Perceptual Name</span>
                    <div className="flex items-center gap-3">
                        <h3 className={`text-2xl lg:text-3xl font-bold text-studio tracking-tight ${loading ? 'opacity-50' : 'opacity-100'} leading-tight`} aria-live="polite">
                            {loading ? 'Analyzing…' : match?.name || 'Unknown'}
                        </h3>
                        {match && !loading && (
                            <button
                                onClick={() => copyToClipboard(match.name, 'name')}
                                className="studio-icon-button studio-icon-button-quiet shrink-0"
                                title="Copy Name"
                                aria-label={`Copy color name ${match.name}`}
                            >
                                <span>{copied === 'name' ? '✓' : 'Copy'}</span>
                                {copied === 'name' && (
                                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-studio text-white text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap z-10">
                                        Copied!
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-end">
                    <span className="studio-section-label mb-1">Database</span>
                    <span className="studio-status-badge">
                        Extended
                    </span>
                </div>
            </div>

            <div className="color-name-meta">
                <div className="flex items-center gap-2">
                    {confidence && (
                        <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${confidence.bgColor}`}></div>
                            <span className={`text-[11px] font-bold uppercase tracking-tight ${confidence.color}`}>
                                {confidence.label}
                            </span>
                            <span className="text-[10px] text-studio-muted font-mono">
                                ({confidence.metricLabel})
                            </span>
                        </div>
                    )}
                </div>

                <div className="color-name-hex">
                    <span className="font-mono text-xs font-bold text-studio/60 uppercase">{hex}</span>
                    <button
                        onClick={() => copyToClipboard(hex, 'hex')}
                        className="studio-icon-button studio-icon-button-quiet"
                        title="Copy Hex"
                        aria-label={`Copy hex value ${hex}`}
                    >
                        {copied === 'hex' ? '✓' : 'Copy'}
                    </button>
                </div>
            </div>

            {source === 'extended' && !loading && match && (
                <p className="text-[9px] text-studio-muted text-right italic">
                    Extended dataset powered by meodai/color-names
                </p>
            )}
            <span className="sr-only" aria-live="polite">{copied ? `${copied} copied` : ''}</span>
        </section>
    );
}
