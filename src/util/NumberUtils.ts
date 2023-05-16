import { BigNumber, utils } from 'ethers'

export function formatUSD(value: number) {
  const formattedValue = value.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(value) ? undefined : 2,
    maximumFractionDigits: 2
  })

  return `$${formattedValue}`
}

export enum MaximumFractionDigits {
  None = 0,
  Short = 1,
  Compact = 3,
  Standard = 4,
  Long = 5
}

/**
 * Parse number according to english formatting.
 *
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
 *
 * Should not be used directly, use formatAmount instead
 */
const formatNumber = (
  number: number,
  options: {
    maximumFractionDigits: MaximumFractionDigits
    notation: 'standard' | 'compact'
  }
): string => Intl.NumberFormat('en', options).format(number)

// Format amount according to a specific set of rules to limit space used
export const formatAmount = <T extends number | BigNumber>(
  balance: T,
  options: {
    decimals?: T extends number ? never : number
    symbol?: string
  } = {}
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
          ? MaximumFractionDigits.Long
          : MaximumFractionDigits.Standard,
        notation: 'compact'
      }) + suffix
    )
  }

  // Long token name, display shortened form with only 1 decimal
  if (!isShortSymbol) {
    return (
      formatNumber(value, {
        maximumFractionDigits: MaximumFractionDigits.Short,
        notation: 'compact'
      }) + suffix
    )
  }

  // Show compact number (1.234T, 1.234M)
  if (value >= 1_000_000) {
    return (
      formatNumber(value, {
        maximumFractionDigits: MaximumFractionDigits.Compact,
        notation: 'compact'
      }) + suffix
    )
  }

  // Show full number without decimals
  if (value >= 10_000) {
    return (
      formatNumber(value, {
        maximumFractionDigits: MaximumFractionDigits.None,
        notation: 'standard'
      }) + suffix
    )
  }

  // Show full number with 4 decimals
  return (
    formatNumber(value, {
      maximumFractionDigits: MaximumFractionDigits.Standard,
      notation: 'standard'
    }) + suffix
  )
}
