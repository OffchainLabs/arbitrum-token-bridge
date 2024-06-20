import Index from '.'
import { useOrbitChainFromRoute } from '../hooks/useOrbitChainFromRoute'
import { useRouter } from 'next/router'

export default function CustomOrbitPage() {
  const router = useRouter()

  const slug = router.query.slug
  const { orbitChain } = useOrbitChainFromRoute()

  // if the slug is present, but doesn't correspond to a valid orbit-chain, redirect to home
  if (slug && !orbitChain) {
    router.replace('/')
  }

  return <Index />
}
