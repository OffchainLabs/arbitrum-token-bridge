import type { Metadata } from 'next'
import {
  ChainKeyQueryParam,
  getChainForChainKeyQueryParam
} from '@/bridge/types/ChainQueryParam'

import { isNetwork } from '@/bridge/util/networks'
import BridgeClient from './BridgeClient'

import 'tippy.js/dist/tippy.css'
import 'tippy.js/themes/light.css'
import '@rainbow-me/rainbowkit/styles.css'
import 'react-toastify/dist/ReactToastify.css'

type Props = {
  searchParams: { [key: string]: string | string[] | undefined }
}

export async function generateMetadata({
  searchParams
}: Props): Promise<Metadata> {
  const sourceChainSlug = (
    typeof searchParams.sourceChain === 'string'
      ? searchParams.sourceChain
      : 'ethereum'
  ) as ChainKeyQueryParam
  const destinationChainSlug = (
    typeof searchParams.destinationChain === 'string'
      ? searchParams.destinationChain
      : 'arbitrum-one'
  ) as ChainKeyQueryParam

  let sourceChainInfo
  let destinationChainInfo

  try {
    sourceChainInfo = getChainForChainKeyQueryParam(sourceChainSlug)
    destinationChainInfo = getChainForChainKeyQueryParam(destinationChainSlug)
  } catch (error) {
    sourceChainInfo = getChainForChainKeyQueryParam('ethereum')
    destinationChainInfo = getChainForChainKeyQueryParam('arbitrum-one')
  }

  const { isOrbitChain: isSourceOrbitChain } = isNetwork(sourceChainInfo.id)
  const { isOrbitChain: isDestinationOrbitChain } = isNetwork(
    destinationChainInfo.id
  )

  const siteTitle = `Bridge to ${destinationChainInfo.name}`
  const siteDescription = `Bridge from ${sourceChainInfo.name} to ${destinationChainInfo.name} using the Arbitrum Bridge. Built to scale Ethereum, Arbitrum brings you 10x lower costs while inheriting Ethereum's security model. Arbitrum is a Layer 2 Optimistic Rollup.`
  const siteDomain = 'https://bridge.arbitrum.io'

  let metaImagePath = `${sourceChainInfo.id}-to-${destinationChainInfo.id}.jpg`

  if (isSourceOrbitChain) {
    metaImagePath = `${sourceChainInfo.id}.jpg`
  }

  if (isDestinationOrbitChain) {
    metaImagePath = `${destinationChainInfo.id}.jpg`
  }

  const imageUrl = `${siteDomain}/images/__auto-generated/open-graph/${metaImagePath}`

  return {
    title: siteTitle,
    description: siteDescription,
    openGraph: {
      url: siteDomain,
      type: 'website',
      title: siteTitle,
      description: siteDescription,
      images: [imageUrl]
    },
    twitter: {
      card: 'summary_large_image',
      site: siteDomain,
      title: siteTitle,
      description: siteDescription,
      images: [imageUrl]
    }
  }
}

export default async function HomePage() {
  return <BridgeClient />
}
