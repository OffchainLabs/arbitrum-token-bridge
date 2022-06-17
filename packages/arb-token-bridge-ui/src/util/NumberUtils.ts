import { BigNumber, utils } from 'ethers'

export function formatNumber(
  etherValue: number,
  maximumFractionDigits: number = 6
) {
  return etherValue.toLocaleString(undefined, { maximumFractionDigits })
}

export function formatBigNumber(weiValue: BigNumber, decimals?: number) {
  if (weiValue.isZero()) {
    return '0'
  }

  return formatNumber(parseFloat(utils.formatUnits(weiValue, decimals || 18)))
}
