import { describe, it, expect, beforeEach } from 'vitest'
import { useDmcStore } from './useDmcStore'

describe('useDmcStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useDmcStore.setState({ stash: [], shoppingList: [] })
  })

  describe('addToStash', () => {
    it('should add a color to the stash if it is not already present', () => {
      const store = useDmcStore.getState()
      store.addToStash('310')
      expect(useDmcStore.getState().stash).toContain('310')
    })

    it('should not add duplicate colors to the stash', () => {
      const store = useDmcStore.getState()
      store.addToStash('310')
      store.addToStash('310')
      expect(useDmcStore.getState().stash).toEqual(['310'])
    })

    it('should remove the color from the shopping list if added to the stash', () => {
      const store = useDmcStore.getState()
      store.addToShoppingList('310')
      expect(useDmcStore.getState().shoppingList).toContain('310')

      store.addToStash('310')
      expect(useDmcStore.getState().stash).toContain('310')
      expect(useDmcStore.getState().shoppingList).not.toContain('310')
    })
  })

  describe('removeFromStash', () => {
    it('should remove a color from the stash', () => {
      const store = useDmcStore.getState()
      store.addToStash('310')
      store.removeFromStash('310')
      expect(useDmcStore.getState().stash).not.toContain('310')
    })
  })

  describe('toggleStash', () => {
    it('should add to stash if not already there', () => {
      const store = useDmcStore.getState()
      store.toggleStash('310')
      expect(useDmcStore.getState().stash).toContain('310')
    })

    it('should remove from stash if already there', () => {
      const store = useDmcStore.getState()
      store.toggleStash('310')
      store.toggleStash('310')
      expect(useDmcStore.getState().stash).not.toContain('310')
    })
  })

  describe('addToShoppingList', () => {
    it('should add a color to the shopping list', () => {
      const store = useDmcStore.getState()
      store.addToShoppingList('666')
      expect(useDmcStore.getState().shoppingList).toContain('666')
    })

    it('should not add a color to the shopping list if it is already in the stash', () => {
      const store = useDmcStore.getState()
      store.addToStash('666')
      store.addToShoppingList('666')
      expect(useDmcStore.getState().shoppingList).not.toContain('666')
    })
  })

  describe('purchaseAllFromList', () => {
    it('should move all shopping list items to the stash and clear the list', () => {
      const store = useDmcStore.getState()
      store.addToShoppingList('310')
      store.addToShoppingList('666')
      store.purchaseAllFromList()

      const state = useDmcStore.getState()
      expect(state.stash).toContain('310')
      expect(state.stash).toContain('666')
      expect(state.shoppingList).toHaveLength(0)
    })
  })
})
