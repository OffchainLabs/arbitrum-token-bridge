import { Provider } from '@ethersproject/providers'
import { isAddress } from 'ethers/lib/utils'

export async function addressIsSmartContract(
  address: string,
  provider: Provider
) {
  try {
    return (await provider.getCode(address)).length > 2
  } catch {
    return false
  }
}

export enum TransferValidationErrors {
  GENERIC_ERROR = 'Something went wrong. Try again later.',
  EOA_INVALID_ADDRESS = 'The destination address is not valid.',
  SC_INVALID_ADDRESS = 'The destination address is not valid. A valid smart contract address is required.',
  SC_MISSING_ADDRESS = 'The destination address is required for smart contract transfers.'
}

export const getSmartContractTransferError = async ({
  from,
  to,
  l1Provider,
  l2Provider,
  isDeposit
}: {
  from: string
  to: string
  l1Provider: Provider
  l2Provider: Provider
  isDeposit: boolean
}): Promise<TransferValidationErrors | null> => {
  const providerFrom = isDeposit ? l1Provider : l2Provider
  const providerTo = isDeposit ? l2Provider : l1Provider
  if (!isAddress(to)) {
    return TransferValidationErrors.SC_MISSING_ADDRESS
  }
  if (!isAddress(from)) {
    return TransferValidationErrors.GENERIC_ERROR
  }
  if (!(await addressIsSmartContract(from, providerFrom))) {
    return TransferValidationErrors.GENERIC_ERROR
  }
  if (!(await addressIsSmartContract(to, providerTo))) {
    return TransferValidationErrors.SC_INVALID_ADDRESS
  }
  return null
}

export const getEOATransferError = async ({
  from,
  to,
  l1Provider,
  l2Provider,
  isDeposit
}: {
  from: string
  to: string
  l1Provider: Provider
  l2Provider: Provider
  isDeposit: boolean
}): Promise<TransferValidationErrors | null> => {
  const providerFrom = isDeposit ? l1Provider : l2Provider
  if (to && !isAddress(to)) {
    return TransferValidationErrors.EOA_INVALID_ADDRESS
  }
  if (!isAddress(from)) {
    return TransferValidationErrors.GENERIC_ERROR
  }
  if (await addressIsSmartContract(from, providerFrom)) {
    return TransferValidationErrors.GENERIC_ERROR
  }
  return null
}
