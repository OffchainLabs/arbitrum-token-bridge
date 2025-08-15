import useSWRImmutable from 'swr/immutable'
import { isAddress } from 'ethers/lib/utils'
import { useAccount } from 'wagmi'

import { DestinationAddressErrors } from '../CustomDestinationAddressInput'
import { addressIsDenylisted } from '../../../util/AddressUtils'
import { useAccountType } from '../../../hooks/useAccountType'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'

export async function getDestinationAddressError({
  destinationAddress,
  isSenderSmartContractWallet,
  isTeleportMode
}: {
  destinationAddress?: string
  isSenderSmartContractWallet: boolean
  isTeleportMode: boolean
}): Promise<DestinationAddressErrors | null> {
  if (!destinationAddress && isSenderSmartContractWallet) {
    // destination address required for contract wallets
    return DestinationAddressErrors.REQUIRED_ADDRESS
  }
  if (!destinationAddress) {
    return null
  }
  if (!isAddress(destinationAddress)) {
    return DestinationAddressErrors.INVALID_ADDRESS
  }
  if (await addressIsDenylisted(destinationAddress)) {
    return DestinationAddressErrors.DENYLISTED_ADDRESS
  }
  if (isTeleportMode) {
    return DestinationAddressErrors.TELEPORT_DISABLED
  }

  // no error
  return null
}

export function useDestinationAddressError(destinationAddress?: string) {
  const [{ destinationAddress: destinationAddressFromQueryParams }] =
    useArbQueryParams()
  const [networks] = useNetworks()
  const { address } = useAccount()
  const { isTeleportMode } = useNetworksRelationship(networks)
  const { isSmartContractWallet: isSenderSmartContractWallet } =
    useAccountType()

  const { data: destinationAddressError } = useSWRImmutable(
    [
      address?.toLowerCase(),
      (destinationAddress ?? destinationAddressFromQueryParams)?.toLowerCase(),
      isSenderSmartContractWallet,
      isTeleportMode,
      'useDestinationAddressError'
    ] as const,
    // Extracts the first element of the query key as the fetcher param
    ([, _destinationAddress, _isSenderSmartContractWallet, _isTeleportMode]) =>
      getDestinationAddressError({
        destinationAddress: _destinationAddress,
        isSenderSmartContractWallet: _isSenderSmartContractWallet,
        isTeleportMode: _isTeleportMode
      })
  )

  return { destinationAddressError }
}
