import { NextResponse } from 'next/server';
import { getFirestoreDb } from '@/lib/firebase';

export async function GET() {
    const db = getFirestoreDb();

    return NextResponse.json({
        status: 'ok',
        commit: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
        firebaseConfigured: !!db,
        timestamp: new Date().toISOString(),
    });
}
