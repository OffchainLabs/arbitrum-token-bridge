import { BigNumber, utils } from 'ethers'

export function formatUSD(value: number) {
  const formattedValue = value.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(value) ? undefined : 2,
    maximumFractionDigits: 2
  })

  return `$${formattedValue}`
}

export const formatNumber = (
  value: number,
  decimals: number = 6,
  options: {
    notation: 'compact' | 'standard'
  } = { notation: 'standard' }
) => {
  const formatter = Intl.NumberFormat('en', {
    notation: options?.notation,
    maximumFractionDigits: decimals
  })
  return formatter.format(value)
}

export enum Decimals {
  None = 0,
  Short = 1,
  Compact = 3,
  Standard = 4,
  Long = 5,
  Token = 18
}
export function formatBigNumber(
  value: BigNumber,
  decimals: Decimals = Decimals.Token,
  maximumFractionDigits?: number
) {
  if (value.isZero()) {
    return '0'
  }

  return formatNumber(
    parseFloat(utils.formatUnits(value, decimals)),
    maximumFractionDigits
  )
}

export function formatTokenBalance(
  balance: BigNumber,
  decimals: number = Decimals.Token,
  symbol: string
) {
  const value = parseFloat(utils.formatUnits(balance, decimals))
  const isShortSymbol = symbol.length < 5

  if (value === 0) {
    return '0'
  }

  // Small number, show 4 or 5 decimals based on token name length
  if (value < 1) {
    return formatNumber(
      value,
      isShortSymbol ? Decimals.Long : Decimals.Standard,
      { notation: 'compact' }
    )
  }

  // Long token name, display shortened form with only 1 decimal
  if (!isShortSymbol) {
    return formatNumber(value, Decimals.Short, { notation: 'compact' })
  }

  // Show compact number (1.234T, 1.234M)
  if (value >= 1_000_000) {
    return formatNumber(value, Decimals.Compact, { notation: 'compact' })
  }

  // Show full number without decimals
  if (value >= 10_000) {
    return formatNumber(value, Decimals.None, { notation: 'standard' })
  }

  // Show full number with 4 decimals
  return formatNumber(value, Decimals.Standard, { notation: 'standard' })
}
