import { BigNumber, utils } from 'ethers'

export function formatUSD(value: number) {
  const formattedValue = value.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(value) ? undefined : 2,
    maximumFractionDigits: 2
  })

  return `$${formattedValue}`
}

export const formatNumber = ({
  value,
  decimals = 6,
  notation = 'standard'
}: {
  value: number
  decimals?: number
  notation?: 'compact' | 'standard'
}) => {
  const formatter = Intl.NumberFormat('en', {
    notation,
    maximumFractionDigits: decimals
  })
  return formatter.format(value)
}

export function formatBigNumber(
  value: BigNumber,
  decimals: number = 18,
  maximumFractionDigits?: number
) {
  if (value.isZero()) {
    return '0'
  }

  return formatNumber({
    value: parseFloat(utils.formatUnits(value, decimals)),
    decimals: maximumFractionDigits
  })
}

export function formatTokenBalance({
  balance,
  decimals = 18,
  symbol
}: {
  balance: BigNumber
  decimals: number
  symbol: string
}) {
  const value = parseFloat(utils.formatUnits(balance, decimals))
  const isShortSymbol = symbol.length < 5

  if (value === 0) {
    return '0'
  }

  // Small number, show 4 or 5 decimals based on token name length
  if (value < 1) {
    return formatNumber({
      value,
      decimals: isShortSymbol ? 5 : 4,
      notation: 'compact'
    })
  }

  // Long token name, display shortened form with only 1 decimal
  if (!isShortSymbol) {
    return formatNumber({ value, decimals: 1, notation: 'compact' })
  }

  // Show compact number (1.234T, 1.234M)
  if (value >= 1_000_000) {
    return formatNumber({ value, decimals: 3, notation: 'compact' })
  }

  // Show full number without decimals
  if (value >= 10_000) {
    return formatNumber({ value, decimals: 0, notation: 'standard' })
  }

  // Show full number with 4 decimals
  return formatNumber({
    value,
    decimals: 4,
    notation: 'standard'
  })
}
