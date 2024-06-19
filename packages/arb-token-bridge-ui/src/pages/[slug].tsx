import Index from '.'
import Custom404Page from './404'
import { useOrbitSlugInRoute } from '../hooks/useOrbitSlugInRoute'

export default function CustomOrbitPage() {
  const { isSlugValid } = useOrbitSlugInRoute()

  if (!isSlugValid) return <Custom404Page />

  return <Index />
}
