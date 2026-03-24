import { NextResponse } from 'next/server';
import { OPEN_SOURCE_MODE } from '@/lib/appMode';

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        commit: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
        openSourceMode: OPEN_SOURCE_MODE,
        timestamp: new Date().toISOString(),
    });
}
