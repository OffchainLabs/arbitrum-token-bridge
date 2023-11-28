import { useMemo } from 'react'

import { isNetwork } from '../../util/networks'
import { useNetworks } from '../useNetworks'

export function useStyles() {
  const [{ sourceChain, destinationChain }] = useNetworks()

  const depositButtonColorClassName = useMemo(() => {
    const { isArbitrumNova, isXaiTestnet, isStylusTestnet, isOrbitChain } =
      isNetwork(destinationChain.id)

    if (isXaiTestnet) {
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
  }, [destinationChain.id])

  const withdrawalButtonColorClassName = useMemo(() => {
    const { isArbitrumNova: isParentChainArbitrumNova } = isNetwork(
      sourceChain.id
    )
    const { isArbitrum } = isNetwork(destinationChain.id)

    if (isArbitrum) {
      return 'bg-eth-dark'
    }

    // is Orbit chain
    if (isParentChainArbitrumNova) {
      return 'bg-arb-nova-dark'
    }

    return 'bg-arb-one-dark'
  }, [sourceChain.id, destinationChain.id])

  return {
    depositButtonColorClassName,
    withdrawalButtonColorClassName
  }
}
