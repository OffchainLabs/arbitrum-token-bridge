import { useRouter } from 'next/router'
import { getOrbitChains } from '../util/orbitChainsList'
import { getBridgeUiConfigForChain } from '../util/bridgeUiConfig'

export const useOrbitChainFromRoute = () => {
  const router = useRouter()

  const slug = router.query.slug
  if (typeof slug !== 'string') return undefined

  const orbitChains = getOrbitChains({ mainnet: true, testnet: false })
  const orbitChain = orbitChains.find(orbitChain => orbitChain.slug === slug)

  // early return if the orbit chain is not found
  if (!orbitChain) return undefined

  // styles for the orbit chain
  const orbitChainColor = getBridgeUiConfigForChain(orbitChain.chainID).color
  const orbitStyles = {
    borderColor: orbitChainColor,
    backgroundColor: `${orbitChainColor}40`
  }

  return {
    chain: orbitChain,
    styles: orbitStyles
  }
}
