import Index from '.'
import { useOrbitChainFromRoute } from '../hooks/useOrbitChainFromRoute'
import { useRouter } from 'next/router'

export default function CustomOrbitPage() {
  const router = useRouter()

  const slug = router.query.slug
  const orbitChainFromRoute = useOrbitChainFromRoute()

  // if the slug is present, but doesn't correspond to a valid orbit-chain, redirect to home
  if (slug && !orbitChainFromRoute) {
    router.replace('/')
  }

  return <Index />
}
