import { useLatest } from 'react-use'

import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { isNetwork } from '../../../util/networks'
import { useNetworks } from '../../../hooks/useNetworks'
import { useIsConnectedToOrbitChain } from '../../../hooks/useIsConnectedToOrbitChain'
import { useIsConnectedToArbitrum } from '../../../hooks/useIsConnectedToArbitrum'

export function useTransferRequiresChainSwitch() {
  const [networks] = useNetworks()
  const { childChain, parentChain, isDepositMode } =
    useNetworksRelationship(networks)
  const isConnectedToArbitrum = useLatest(useIsConnectedToArbitrum())
  const isConnectedToOrbitChain = useLatest(useIsConnectedToOrbitChain())

  const isParentChainEthereum = isNetwork(
    parentChain.id
  ).isEthereumMainnetOrTestnet

  const depositRequiresChainSwitch =
    isDepositMode &&
    ((isParentChainEthereum && isConnectedToArbitrum.current) ||
      isConnectedToOrbitChain.current)

  const isConnectedToEthereum =
    !isConnectedToArbitrum.current && !isConnectedToOrbitChain.current

  const { isOrbitChain: isSourceChainOrbit } = isNetwork(childChain.id)

  const withdrawalRequiresChainSwitch =
    !isDepositMode &&
    (isConnectedToEthereum ||
      (isConnectedToArbitrum.current && isSourceChainOrbit))

  return { depositRequiresChainSwitch, withdrawalRequiresChainSwitch }
}
