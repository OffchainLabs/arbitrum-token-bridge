export enum TransferReadinessRichErrorMessage {
  GAS_ESTIMATION_FAILURE,
  TOKEN_WITHDRAW_ONLY,
  TOKEN_TRANSFER_DISABLED
}

type GetInsufficientFundsErrorMessageParams = {
  asset: string
  chain: string
}

type GetInsufficientFundsForGasFeesErrorMessageParams = {
  asset: string
  chain: string
  balance: string
  requiredBalance: string
}

export function getInsufficientFundsErrorMessage({
  asset,
  chain
}: GetInsufficientFundsErrorMessageParams) {
  return `Insufficient ${asset}. Please add more funds to ${chain}.`
}

export function getInsufficientFundsForGasFeesErrorMessage({
  asset,
  chain,
  balance,
  requiredBalance
}: GetInsufficientFundsForGasFeesErrorMessageParams) {
  if (balance === requiredBalance) {
    // if our formatAmount method rounds these to the same amount, we add a little buffer to the required balance
    // TODO: this may need to be rescaled for non-18 decimal chains
    requiredBalance = String(Number(requiredBalance) + 0.0001)
  }

  return `Insufficient ${asset} to pay for gas fees. You currently have ${balance} ${asset}, but the transaction requires ${requiredBalance} ${asset}. Please add more funds to ${chain}.`
}

export function getSmartContractWalletNativeCurrencyTransfersNotSupportedErrorMessage({
  asset
}: {
  asset: string
}) {
  return `${asset} transfers using smart contract wallets aren't supported yet.`
}

export function getSmartContractWalletTeleportTransfersNotSupportedErrorMessage() {
  return `LayerLeap transfers using smart contract wallets aren't supported yet.`
}
