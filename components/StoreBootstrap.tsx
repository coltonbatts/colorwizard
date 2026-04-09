'use client'

import { useEffect } from 'react'
import { migrateLegacyStore } from '@/lib/store/migrateLegacyStore'

export default function StoreBootstrap() {
    useEffect(() => {
        migrateLegacyStore()
    }, [])

    return null
}
