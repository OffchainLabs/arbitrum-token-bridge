import { useMemo } from 'react'
import useSWRImmutable from 'swr/immutable'
import { isAddress } from 'ethers/lib/utils.js'

import {
  DestinationAddressErrors,
  useDestinationAddressStore
} from '../AdvancedSettings'
import { addressIsDenylisted } from '../../../util/AddressUtils'
import { useAccountType } from '../../../hooks/useAccountType'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'

export async function getDestinationAddressError({
  destinationAddress,
  isSmartContractWallet,
  isTeleportMode
}: {
  destinationAddress?: string
  isSmartContractWallet: boolean
  isTeleportMode: boolean
}): Promise<DestinationAddressErrors | null> {
  if (!destinationAddress && isSmartContractWallet) {
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

export function useDestinationAddressError() {
  const { destinationAddress } = useDestinationAddressStore()
  const [networks] = useNetworks()
  const { isTeleportMode } = useNetworksRelationship(networks)
  const { isSmartContractWallet } = useAccountType()

  const queryKey = useMemo(() => {
    if (typeof destinationAddress === 'undefined') {
      // Don't fetch
      return null
    }

    return [
      destinationAddress.toLowerCase(),
      isSmartContractWallet,
      isTeleportMode,
      'useDestinationAddressError'
    ] as const
  }, [destinationAddress, isSmartContractWallet, isTeleportMode])

  const { data: destinationAddressError } = useSWRImmutable(
    queryKey,
    // Extracts the first element of the query key as the fetcher param
    ([_destinationAddress, _isSmartContractWallet, _isTeleportMode]) =>
      getDestinationAddressError({
        destinationAddress: _destinationAddress,
        isSmartContractWallet: _isSmartContractWallet,
        isTeleportMode: _isTeleportMode
      })
  )

  return { destinationAddressError }
}
