import type { StyleSpecification } from 'maplibre-gl'
import { describe, expect, it } from 'vitest'
import { isoToDecimalDate, ohmHistoricalStyle, withDateFilter } from './ohmStyle'

describe('isoToDecimalDate', () => {
  // Expected values come from decimaldate.iso2dec in the OHM website
  it.each([
    ['2026-11-27', 2026.90548],
    ['2000-02-29', 2000.16257],
    ['1492-10-12', 1492.78005],
    ['0001-01-01', 1.00137],
    ['0000-12-31', 0.99863],
    ['-0500-06-15', -499.54658],
  ])('converts %s', (iso, expected) => {
    expect(isoToDecimalDate(iso)).toBe(expected)
  })

  it('rejects malformed dates', () => {
    expect(() => isoToDecimalDate('1900')).toThrow()
  })
})

describe('withDateFilter', () => {
  const style = {
    version: 8,
    sources: {
      ohm: { type: 'vector', tiles: [] },
      other: { type: 'vector', tiles: [] },
    },
    layers: [
      { id: 'bg', type: 'background' },
      { id: 'roads', type: 'line', source: 'ohm', 'source-layer': 'roads' },
      {
        id: 'water',
        type: 'fill',
        source: 'ohm',
        'source-layer': 'water',
        filter: ['==', 'type', 'lake'],
      },
      { id: 'land', type: 'fill', source: 'other', 'source-layer': 'land' },
    ],
  } as StyleSpecification

  it('adds the date filter only to OHM layers and keeps existing filters', () => {
    const [bg, roads, water, land] = withDateFilter(style, '1900-01-01').layers
    expect(bg).not.toHaveProperty('filter')
    expect(land).not.toHaveProperty('filter')
    expect((roads as { filter: unknown[] }).filter[0]).toBe('all')
    const waterFilter = (water as { filter: unknown[] }).filter
    expect(waterFilter[0]).toBe('all')
    expect(waterFilter[2]).toEqual(['==', 'type', 'lake'])
  })
})

describe('ohmHistoricalStyle', () => {
  it('is named and uses the OHM vector source', () => {
    const style = ohmHistoricalStyle()
    expect(style.name).toBe('OpenHistoricalMap')
    expect(style.sources.ohm).toBeDefined()
  })
})
