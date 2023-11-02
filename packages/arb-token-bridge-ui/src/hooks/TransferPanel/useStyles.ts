import { useMemo } from 'react'

import { isNetwork } from '../../util/networks'
import { useNetworks } from '../useNetworks'

export function useStyles() {
  const [{ from, to }] = useNetworks()

  const depositButtonColorClassName = useMemo(() => {
    const { isArbitrumNova, isXaiTestnet, isStylusTestnet, isOrbitChain } =
      isNetwork(to.id)

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
  }, [to.id])

  const withdrawalButtonColorClassName = useMemo(() => {
    const { isArbitrumNova: isParentChainArbitrumNova } = isNetwork(from.id)
    const { isArbitrum } = isNetwork(to.id)

    if (isArbitrum) {
      return 'bg-eth-dark'
    }

    // is Orbit chain
    if (isParentChainArbitrumNova) {
      return 'bg-arb-nova-dark'
    }

    return 'bg-arb-one-dark'
  }, [from.id, to.id])

  return {
    depositButtonColorClassName,
    withdrawalButtonColorClassName
  }
}
