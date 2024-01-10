import { useMemo } from 'react'

import { isNetwork } from '../../util/networks'
import { useNetworks } from '../useNetworks'
import { useNetworksRelationship } from '../useNetworksRelationship'

export function useStyles() {
  const [networks] = useNetworks()
  const { childChain, parentChain } = useNetworksRelationship(networks)

  const depositButtonColorClassName = useMemo(() => {
    const {
      isArbitrumNova,
      isXaiTestnet,
      isXai,
      isStylusTestnet,
      isOrbitChain
    } = isNetwork(childChain.id)

    if (isXaiTestnet || isXai) {
      return 'bg-xai-dark'
    }

    if (isStylusTestnet) {
      return 'bg-stylus-dark'
    }

    if (isArbitrumNova) {
      return 'bg-arb-nova-dark'
    }

    if (isOrbitChain) {
      return 'bg-orbit-dark'
    }

    // isArbitrum
    return 'bg-arb-one-dark'
  }, [childChain.id])

  const withdrawalButtonColorClassName = useMemo(() => {
    const { isArbitrumNova: isParentChainArbitrumNova } = isNetwork(
      parentChain.id
    )
    const { isArbitrum } = isNetwork(childChain.id)

    if (isArbitrum) {
      return 'bg-eth-dark'
    }

    // is Orbit chain
    if (isParentChainArbitrumNova) {
      return 'bg-arb-nova-dark'
    }

    return 'bg-arb-one-dark'
  }, [childChain.id, parentChain.id])

  return {
    depositButtonColorClassName,
    withdrawalButtonColorClassName
  }
}
