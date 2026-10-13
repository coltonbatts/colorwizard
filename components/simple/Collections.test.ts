import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createCollection, emptyLibrary, saveColor, setMembership } from '@/lib/colorLibrary'
import CollectionPicker from './CollectionPicker'
import SavedStrip from './SavedStrip'

const noop = () => undefined
function library() {
  let lib = saveColor(emptyLibrary(), { id: 'c1', hex: '#C45C3E', name: 'Tartare', now: 1 }).library
  lib = saveColor(lib, { id: 'c2', hex: '#397DA8', name: '', now: 2 }).library
  lib = createCollection(lib, { id: 'k1', name: 'Roof', now: 3 }).library
  lib = createCollection(lib, { id: 'k2', name: 'Walls', now: 4 }).library
  return setMembership(lib, 'c1', 'k1', true, 5)
}
const strip = (filter: string | null) => renderToStaticMarkup(createElement(SavedStrip, {
  library: library(), activeId: null, filter, onFilter: noop, onOpen: noop, onRemove: noop, onDeleteCollection: noop,
}))

describe('SavedStrip', () => {
  it('shows every color and no filters when there are no collections', () => {
    const lib = saveColor(emptyLibrary(), { id: 'c1', hex: '#C45C3E', name: '', now: 1 }).library
    const out = renderToStaticMarkup(createElement(SavedStrip, { library: lib, activeId: null, filter: null, onFilter: noop, onOpen: noop, onRemove: noop, onDeleteCollection: noop }))
    expect(out).toContain('Open saved color #C45C3E')
    expect(out).not.toContain('Show collection')
  })

  it('counts colors per collection and starts on All', () => {
    const out = strip(null)
    expect(out).toMatch(/aria-pressed="true"[^>]*>All <span>2<\/span>/)
    expect(out).toMatch(/>Roof <span>1<\/span>/)
    expect(out).toMatch(/>Walls <span>0<\/span>/)
    expect(out).toContain('Open saved color #397DA8')
  })

  it('filters to a collection and offers to delete only that grouping', () => {
    const out = strip('k1')
    expect(out).toContain('Open saved color #C45C3E')
    expect(out).not.toContain('Open saved color #397DA8')
    expect(out).toContain('Delete this collection…')
  })

  it('says how to fill an empty collection', () => {
    const out = strip('k2')
    expect(out).toContain('Nothing in Walls yet')
    expect(out).not.toContain('Open saved color')
  })

  it('treats a collection that no longer exists as All', () => {
    expect(strip('gone')).toContain('Open saved color #397DA8')
  })
})

describe('CollectionPicker', () => {
  const lib = library()
  const out = renderToStaticMarkup(createElement(CollectionPicker, { color: lib.colors[0], collections: lib.collections, onToggle: () => true, onCreate: () => null }))

  it('ticks the collections the color is in', () => {
    expect(out).toMatch(/<input type="checkbox" checked=""[^>]*\/>Roof/)
    expect(out).toMatch(/<input type="checkbox"(?![^>]*checked)[^>]*\/>Walls/)
  })

  it('offers a new collection without showing the form until asked', () => {
    expect(out).toContain('New collection…')
    expect(out).not.toContain('Collection name')
  })
})
