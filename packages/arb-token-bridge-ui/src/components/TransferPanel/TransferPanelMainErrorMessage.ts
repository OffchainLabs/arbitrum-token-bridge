export enum TransferPanelMainRichErrorMessage {
  GAS_ESTIMATION_FAILURE,
  TOKEN_WITHDRAW_ONLY
}

export type GetInsufficientFundsErrorMessageParams = {
  asset: string
  chain: string
}

export function getInsufficientFundsErrorMessage({
  asset,
  chain
}: GetInsufficientFundsErrorMessageParams) {
  return `Insufficient ${asset}. Please add more funds to ${chain}.`
}

export function getInsufficientFundsForGasFeesErrorMessage({
  asset,
  chain
}: GetInsufficientFundsErrorMessageParams) {
  return `Insufficient ${asset} to pay for gas fees. Please add more funds to ${chain}.`
}

export function getSmartContractWalletNativeCurrencyTransfersNotSupportedErrorMessage({
  asset
}: {
  asset: string
}) {
  return `${asset} transfers using smart contract wallets aren't supported yet.`
}
