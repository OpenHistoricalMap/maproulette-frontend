import type { FilterSpecification, StyleSpecification } from 'maplibre-gl'
import OhmHistorical from './ohm-historical.json'

/** Vector source in the OHM style whose features carry start/end dates. */
const OHM_SOURCE = 'ohm'

const RE_ISO_DATE = /^(-?)(\d+)-(\d\d)-(\d\d)$/

const isLeapYear = (year: number): boolean => {
  // There is no year 0, so BCE leap years are -1, -5, -9, ...
  const y = year > 0 ? year : year + 1
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/**
 * ISO date (YYYY-MM-DD, optional leading minus) to OHM decimal date, matching
 * decimaldate.iso2dec in the OHM website and start_decdate/end_decdate in the tiler.
 */
export const isoToDecimalDate = (iso: string): number => {
  const match = iso.match(RE_ISO_DATE)
  if (!match) throw new Error(`Invalid date: ${iso}`)
  const [, sign, yearStr, monthStr, dayStr] = match
  let year = Number.parseInt(yearStr, 10) * (sign === '-' ? -1 : 1)
  if (year <= 0) year -= 1 // ISO 8601: 0000 = 1 BCE = -1
  const month = Number.parseInt(monthStr, 10)
  const day = Number.parseInt(dayStr, 10)

  const leap = isLeapYear(year)
  const daysInYear = leap ? 366 : 365
  let daysPassed = 0
  for (let m = 1; m < month; m++) daysPassed += m === 2 && leap ? 29 : DAYS_IN_MONTH[m - 1]
  // Noon of the target day
  const fraction = (daysPassed + day - 0.5) / daysInYear

  const decimal = year < 0 ? 1 + 1 + year - (1 - fraction) : year + fraction
  return Number.parseFloat(decimal.toFixed(5))
}

/** Today as YYYY-MM-DD. */
const todayIso = (): string => new Date().toISOString().slice(0, 10)

/** Only show OHM features that exist on the given decimal date. */
const dateFilter = (decdate: number): FilterSpecification => [
  'all',
  [
    'any',
    ['!', ['has', 'start_decdate']],
    ['<=', ['to-number', ['get', 'start_decdate'], -Infinity], ['literal', decdate]],
  ],
  [
    'any',
    ['!', ['has', 'end_decdate']],
    ['>=', ['to-number', ['get', 'end_decdate'], Infinity], ['literal', decdate]],
  ],
]

/** A copy of the style with a date filter added to every layer of the OHM source. */
export const withDateFilter = (style: StyleSpecification, iso: string): StyleSpecification => {
  const clause = dateFilter(isoToDecimalDate(iso))
  return {
    ...style,
    layers: style.layers.map((layer) => {
      if (!('source' in layer) || layer.source !== OHM_SOURCE) return layer
      const filter = layer.filter ? (['all', clause, layer.filter] as FilterSpecification) : clause
      return { ...layer, filter }
    }),
  }
}

/** Date the OHM basemap shows: VITE_OHM_MAP_DATE (YYYY-MM-DD) or today. */
const ohmMapDate = (): string => {
  const configured = typeof window !== 'undefined' ? window.env?.VITE_OHM_MAP_DATE : undefined
  if (configured && RE_ISO_DATE.test(configured)) return configured
  return todayIso()
}

/** The OHM historical style, filtered to the configured date. */
export const ohmHistoricalStyle = (): StyleSpecification =>
  withDateFilter(OhmHistorical as unknown as StyleSpecification, ohmMapDate())
