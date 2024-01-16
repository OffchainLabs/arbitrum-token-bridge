import { useMemo } from 'react'

import { isNetwork } from '../../util/networks'
import { useNetworksAndSigners } from '../useNetworksAndSigners'

export function useStyles() {
  const {
    l1: { network: l1Network },
    l2: { network: l2Network }
  } = useNetworksAndSigners()

  const depositButtonColorClassName = useMemo(() => {
    const {
      isArbitrumNova,
      isXaiTestnet,
      isXai,
      isStylusTestnet,
      isOrbitChain
    } = isNetwork(l2Network.id)

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
  }, [l2Network.id])

  const withdrawalButtonColorClassName = useMemo(() => {
    const { isArbitrumNova: isParentChainArbitrumNova } = isNetwork(
      l1Network.id
    )
    const { isArbitrum } = isNetwork(l2Network.id)

    if (isArbitrum) {
      return 'bg-eth-dark'
    }

    // is Orbit chain
    if (isParentChainArbitrumNova) {
      return 'bg-arb-nova-dark'
    }

    return 'bg-arb-one-dark'
  }, [l1Network.id, l2Network.id])

  return {
    depositButtonColorClassName,
    withdrawalButtonColorClassName
  }
}
