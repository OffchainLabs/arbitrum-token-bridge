import { BigNumber, utils } from 'ethers'

export function formatUSD(value: number) {
  const formattedValue = value.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(value) ? undefined : 2,
    maximumFractionDigits: 2
  })

  return `$${formattedValue}`
}

export function formatNumber(value: number, maximumFractionDigits: number = 6) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits
  })
}

export function formatBigNumber(value: BigNumber, decimals: number = 18) {
  if (value.isZero()) {
    return '0'
  }

  return formatNumber(parseFloat(utils.formatUnits(value, decimals)))
}
