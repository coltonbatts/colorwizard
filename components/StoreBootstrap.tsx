'use client'

import { migrateLegacyStore } from '@/lib/store/migrateLegacyStore'

export default function StoreBootstrap() {
    migrateLegacyStore()

    return null
}
