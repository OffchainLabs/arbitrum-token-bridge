import { TransactionRequest } from '@lifi/sdk'

export function isValidTransactionRequest(
  transactionRequest: TransactionRequest | undefined
): transactionRequest is Required<
  Pick<
    TransactionRequest,
    'value' | 'to' | 'data' | 'from' | 'chainId' | 'gasPrice' | 'gasLimit'
  >
> {
  if (!transactionRequest) {
    return false
  }

  const { value, to, data, from, chainId, gasPrice, gasLimit } =
    transactionRequest

  if (!value || !to || !data || !from || !chainId || !gasPrice || !gasLimit) {
    return false
  }

  return true
}
