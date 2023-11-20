import { getDestinationAddressError } from '../../../components/TransferPanel/AdvancedSettings'

export const checkValidDestinationAddress = async ({
  destinationAddress,
  isSmartContractWallet
}: {
  destinationAddress: string | undefined
  isSmartContractWallet: boolean
}) => {
  const destinationAddressError = await getDestinationAddressError({
    destinationAddress,
    isSmartContractWallet
  })
  if (destinationAddressError) {
    throw destinationAddressError
  }

  return true
}
