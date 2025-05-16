export enum TransferReadinessRichErrorMessage {
  GAS_ESTIMATION_FAILURE,
  TOKEN_WITHDRAW_ONLY,
  TOKEN_TRANSFER_DISABLED
}

type GetInsufficientFundsErrorMessageParams = {
  asset: string
  chain: string
}

type GetInsufficientFundsForGasFeesErrorMessageParams =
  GetInsufficientFundsErrorMessageParams & {
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
  const errorMessage = `Please add more ${asset} on ${chain} to pay for fees.`

  if (balance === requiredBalance) {
    // An edge case where formatAmount returns the same value. In this case we don't want to show balances because in the UI it's the same as requiredBalance.
    return errorMessage
  }

  return (
    errorMessage +
    ` You currently have ${balance} ${asset}, but the transaction requires ${requiredBalance} ${asset}.`
  )
}

export function getSmartContractWalletTeleportTransfersNotSupportedErrorMessage() {
  return `LayerLeap transfers using smart contract wallets aren't supported yet.`
}

export function getWithdrawOnlyChainErrorMessage(chainName: string) {
  return `${chainName} has currently suspended deposits. You can only withdraw assets from this chain.`
}
