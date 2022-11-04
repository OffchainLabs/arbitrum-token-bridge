import { BigNumber, utils } from 'ethers'

export function formatUSD(value: number) {
  const formattedValue = value.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(value) ? undefined : 2,
    maximumFractionDigits: 2
  })

  return `$${formattedValue}`
}

export enum Decimals {
  None = 0,
  Short = 1,
  Compact = 3,
  Standard = 4,
  Long = 5,
  Token = 18
}

/**
 * Parse number according to english formatting.
 *
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
 *
 * Should not be used directly, use formatAmount instead
 * NOTE: decimals is only here to parse BigNumber to number, not to control the display
 * maximumFractionDigits should be used instead to control the display
 */
const formatNumber = <T extends number | BigNumber>(
  number: T,
  options: {
    decimals?: T extends number ? never : number
    maximumFractionDigits?: number
    notation?: 'compact' | 'standard'
  } = {
    maximumFractionDigits: 3,
    notation: 'standard'
  }
): string => {
  const { decimals, notation, maximumFractionDigits } = options
  const value: number = BigNumber.isBigNumber(number)
    ? parseFloat(utils.formatUnits(number, decimals ?? Decimals.Token))
    : number

  return Intl.NumberFormat('en', {
    notation,
    maximumFractionDigits
  }).format(value)
}

/**
 * Format amount according to a specific set of rules to limit space used
 *
 * NOTE: decimals is only here to parse BigNumber to number, not to control the display
 */
export const formatAmount = <T extends number | BigNumber>(
  balance: T,
  options: {
    decimals?: T extends number ? never : number
    symbol?: string
  }
): string => {
  const { decimals, symbol } = options
  const value: number = BigNumber.isBigNumber(balance)
    ? parseFloat(utils.formatUnits(balance, decimals))
    : balance
  const suffix = symbol ? ` ${symbol}` : ''

  if (value === 0) {
    return `0${suffix}`
  }

  const isShortSymbol = options.symbol ? options.symbol.length < 5 : true

  // Small number, show 4 or 5 decimals based on token name length
  if (value < 1) {
    return (
      formatNumber(value, {
        maximumFractionDigits: isShortSymbol
          ? Decimals.Long
          : Decimals.Standard,
        notation: 'compact'
      }) + suffix
    )
  }

  // Long token name, display shortened form with only 1 decimal
  if (!isShortSymbol) {
    return (
      formatNumber(value, {
        maximumFractionDigits: Decimals.Short,
        notation: 'compact'
      }) + suffix
    )
  }

  // Show compact number (1.234T, 1.234M)
  if (value >= 1_000_000) {
    return (
      formatNumber(value, {
        maximumFractionDigits: Decimals.Compact,
        notation: 'compact'
      }) + suffix
    )
  }

  // Show full number without decimals
  if (value >= 10_000) {
    return (
      formatNumber(value, {
        maximumFractionDigits: Decimals.None,
        notation: 'standard'
      }) + suffix
    )
  }

  // Show full number with 4 decimals
  return (
    formatNumber(value, {
      maximumFractionDigits: Decimals.Standard,
      notation: 'standard'
    }) + suffix
  )
}
