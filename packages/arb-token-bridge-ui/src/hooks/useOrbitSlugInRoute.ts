import { useRouter } from 'next/router'
import { getOrbitChains } from '../util/orbitChainsList'
import { getBridgeUiConfigForChain } from '../util/bridgeUiConfig'

export const useOrbitSlugInRoute = () => {
  const router = useRouter()
  const slug = router.query.slug

  if (!slug) return { isSlugValid: true, isCustomOrbitChainPage: false }

  if (typeof slug !== 'string')
    return { isSlugValid: false, isCustomOrbitChainPage: false }

  const orbitChains = getOrbitChains({ mainnet: true, testnet: false })
  const orbitChain = orbitChains.find(orbitChain => orbitChain.slug === slug)
  const isCustomOrbitChainPage = !!orbitChain

  // styles for the orbit chain
  const orbitChainColor = isCustomOrbitChainPage
    ? getBridgeUiConfigForChain(orbitChain.chainID).color
    : ''
  const orbitStyles = isCustomOrbitChainPage
    ? {
        borderColor: orbitChainColor,
        backgroundColor: `${orbitChainColor}40`
      }
    : undefined

  return {
    orbitSlugInRoute: slug,
    isSlugValid: !!orbitChain,
    orbitChain,
    isCustomOrbitChainPage,
    orbitStyles
  }
}
