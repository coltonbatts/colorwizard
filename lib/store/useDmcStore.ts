'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { safeStorage } from './storage'

interface DmcInventoryState {
  stash: string[] // List of DMC thread numbers (e.g. '310', 'Blanc')
  shoppingList: string[] // List of DMC thread numbers to purchase

  addToStash: (code: string) => void
  removeFromStash: (code: string) => void
  toggleStash: (code: string) => void
  addToShoppingList: (code: string) => void
  removeFromShoppingList: (code: string) => void
  toggleShoppingList: (code: string) => void
  clearStash: () => void
  clearShoppingList: () => void
  purchaseAllFromList: () => void
}

export const useDmcStore = create<DmcInventoryState>()(
  persist(
    (set) => ({
      stash: [],
      shoppingList: [],

      addToStash: (code) =>
        set((state) => {
          const trimmed = code.trim()
          if (!trimmed || state.stash.includes(trimmed)) return {}
          return {
            stash: [...state.stash, trimmed],
            // Remove from shopping list if added to stash
            shoppingList: state.shoppingList.filter((item) => item !== trimmed),
          }
        }),

      removeFromStash: (code) =>
        set((state) => ({
          stash: state.stash.filter((item) => item !== code.trim()),
        })),

      toggleStash: (code) =>
        set((state) => {
          const trimmed = code.trim()
          const isOwned = state.stash.includes(trimmed)
          if (isOwned) {
            return { stash: state.stash.filter((item) => item !== trimmed) }
          } else {
            return {
              stash: [...state.stash, trimmed],
              shoppingList: state.shoppingList.filter((item) => item !== trimmed),
            }
          }
        }),

      addToShoppingList: (code) =>
        set((state) => {
          const trimmed = code.trim()
          if (!trimmed || state.shoppingList.includes(trimmed) || state.stash.includes(trimmed)) {
            return {}
          }
          return { shoppingList: [...state.shoppingList, trimmed] }
        }),

      removeFromShoppingList: (code) =>
        set((state) => ({
          shoppingList: state.shoppingList.filter((item) => item !== code.trim()),
        })),

      toggleShoppingList: (code) =>
        set((state) => {
          const trimmed = code.trim()
          if (state.stash.includes(trimmed)) return {} // Can't put owned in shopping list

          const isOnList = state.shoppingList.includes(trimmed)
          if (isOnList) {
            return { shoppingList: state.shoppingList.filter((item) => item !== trimmed) }
          } else {
            return { shoppingList: [...state.shoppingList, trimmed] }
          }
        }),

      clearStash: () => set({ stash: [] }),
      clearShoppingList: () => set({ shoppingList: [] }),

      purchaseAllFromList: () =>
        set((state) => {
          const newStash = [...state.stash]
          for (const item of state.shoppingList) {
            if (!newStash.includes(item)) {
              newStash.push(item)
            }
          }
          return {
            stash: newStash,
            shoppingList: [],
          }
        }),
    }),
    {
      name: 'colorwizard-dmc-inventory',
      storage: safeStorage,
    }
  )
)
