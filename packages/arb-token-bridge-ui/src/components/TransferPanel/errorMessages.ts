export type GetInsufficientFundsErrorMessageParams = {
  asset: string
  chain: string
}

export function getInsufficientFundsErrorMessage({
  asset,
  chain
}: GetInsufficientFundsErrorMessageParams) {
  return `Insufficient ${asset}. Please add more to ${chain}.`
}

export function getInsufficientFundsForGasFeesErrorMessage({
  asset,
  chain
}: GetInsufficientFundsErrorMessageParams) {
  return `Insufficient ${asset} to pay for gas fees. Please add more to ${chain}.`
}
