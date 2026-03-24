import { NextRequest, NextResponse } from 'next/server';
import { generateAiSuggestions } from '@/lib/ai/suggestions';

/**
 * AI Suggestions API — delegates to shared pure logic (also used client-side for offline).
 */
export async function POST(req: NextRequest) {
    try {
        const { rgb } = (await req.json()) as { rgb?: { r: number; g: number; b: number } };
        // Historic behavior: route always returned the full “Pro” payload (tier in body was ignored).
        const isPro = true;

        if (!rgb || typeof rgb.r !== 'number') {
            return NextResponse.json({ error: 'Invalid RGB color' }, { status: 400 });
        }

        const payload = generateAiSuggestions(rgb, { isPro });
        return NextResponse.json(payload);
    } catch (error) {
        console.error('AI Suggestion Error:', error);
        return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
    }
}
