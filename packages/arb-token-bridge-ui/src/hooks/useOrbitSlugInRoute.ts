import { useRouter } from 'next/router'
import { getOrbitChains } from '../util/orbitChainsList'

export const useOrbitSlugInRoute = () => {
  const router = useRouter()
  const slug = router.query.slug
  if (!slug) return { isSlugValid: true, isCustomOrbitChainPage: false }

  const orbitChains = getOrbitChains({ mainnet: true, testnet: false })
  const orbitChain = orbitChains.find(orbitChain => orbitChain.slug === slug)

  return {
    orbitSlugInRoute: orbitChain ? slug : undefined,
    isSlugValid: slug && orbitChain,
    orbitChain,
    isCustomOrbitChainPage: orbitChain ? true : false
  }
}
