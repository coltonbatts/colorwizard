import { NextRequest, NextResponse } from 'next/server';
import { getColorHarmonies, getChromaLevel, getValueLevel, getMixingGuidance, RGB } from '@/lib/colorTheory';

/**
 * AI Suggestions API - Generates professional color theory suggestions.
 * Gated for Pro users.
 */
export async function POST(req: NextRequest) {
    try {
        const { rgb, tier } = await req.json();

        // Security check - only Pro users get "Advanced" suggestions
        // (In a real app, this would check the authenticated user's tier in DB)
        const isPro = tier === 'pro';

        if (!rgb || typeof rgb.r !== 'number') {
            return NextResponse.json({ error: 'Invalid RGB color' }, { status: 400 });
        }

        const harmonies = getColorHarmonies(rgb);
        const chroma = getChromaLevel(rgb);
        const value = getValueLevel(rgb);
        const mixing = getMixingGuidance(rgb);

        // professional "AI" Analysis
        // This logic is handcrafted to feel like a pro painter's advice.
        const suggestions = [
            {
                type: 'Classical Harmony',
                title: 'The Complementary Contrast',
                description: `To create maximum focal pop, use **${harmonies.complementary.name}** sparingly against your base color. In oil painting, mixing these two will create a perfect chromatic neutral.`,
                colors: [harmonies.complementary.color],
                pigments: isPro ? ['Cadmium Red', 'Ultramarine Blue'] : undefined
            },
            {
                type: 'Atmospheric Perspective',
                title: 'Analogous Depth',
                description: `For subtle transitions in shadows, lean into **${harmonies.analogous[0].name}** and **${harmonies.analogous[1].name}**. This maintains a "single-light" atmosphere common in Caravaggio's works.`,
                colors: harmonies.analogous.map(a => a.color),
                pigments: isPro ? ['Yellow Ochre', 'Raw Sienna'] : undefined
            }
        ];

        // Add extra depth for Pro users
        if (isPro) {
            suggestions.push({
                type: 'Advanced Theory',
                title: 'Split-Complementary Tension',
                description: `Use **${harmonies.splitComplementary[0].name}** and **${harmonies.splitComplementary[1].name}** to create a sophisticated vibrance without the harshness of a direct complement. This is a common strategy for Impressionist skin tones.`,
                colors: harmonies.splitComplementary.map(s => s.color),
                pigments: ['Alizarin Crimson', 'Viridian', 'Cobalt Blue']
            });
        }

        return NextResponse.json({
            baseAnalysis: {
                chroma: chroma.description,
                value: value.description,
                mixingTip: mixing.generalTip
            },
            suggestions,
            isPro
        });

    } catch (error) {
        console.error('AI Suggestion Error:', error);
        return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
    }
}
