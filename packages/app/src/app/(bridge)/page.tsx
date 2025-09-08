import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import {
  ChainKeyQueryParam,
  getChainForChainKeyQueryParam
} from '@/bridge/types/ChainQueryParam'

import { isNetwork, registerLocalNetwork } from '@/bridge/util/networks'
import BridgeClient from './BridgeClient'
import {
  decodeChainQueryParam,
  encodeChainQueryParam,
  DisabledFeaturesParam,
  ModeParamEnum,
  sanitizeQueryParams,
  encodeString,
  sanitizeTokenQueryParam,
  sanitizeTabQueryParam
} from '@/bridge/util/queryParamUtils'
import { sanitizeExperimentalFeaturesQueryParam } from '@/bridge/util'
import {
  isE2eTestingEnvironment,
  isProductionEnvironment
} from '@/bridge/util/CommonUtils'
import { addOrbitChainsToArbitrumSDK } from '../../initialization'

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

function getDestinationWithSanitizedQueryParams(
  sanitized: {
    sourceChainId: number
    destinationChainId: number
    experiments: string | undefined
    token: string | undefined
    tab: string
    disabledFeatures: string[] | undefined
    mode: string | undefined
  },
  query: Record<string, string | string[] | undefined>
) {
  const params = new URLSearchParams()

  for (const key in query) {
    // don't copy "sourceChain" and "destinationChain" query params
    if (
      key === 'sourceChain' ||
      key === 'destinationChain' ||
      key === 'experiments' ||
      key === 'token' ||
      key === 'tab' ||
      key === 'disabledFeatures' ||
      key === 'mode'
    ) {
      continue
    }

    const value = query[key]

    // copy everything else
    if (typeof value === 'string') {
      params.set(key, value)
    }
  }

  const encodedSource = encodeChainQueryParam(sanitized.sourceChainId)
  const encodedDestination = encodeChainQueryParam(sanitized.destinationChainId)
  const encodedExperiments = encodeString(sanitized.experiments)
  const encodedToken = encodeString(sanitized.token)
  const encodedTab = encodeString(sanitized.tab)
  const encodedMode = encodeString(sanitized.mode)

  if (encodedSource) {
    params.set('sourceChain', encodedSource)

    if (encodedDestination) {
      params.set('destinationChain', encodedDestination)
    }
  }

  if (encodedExperiments) {
    params.set('experiments', encodedExperiments)
  }

  if (encodedToken) {
    params.set('token', encodedToken)
  }

  if (encodedTab) {
    params.set('tab', encodedTab)
  }

  if (encodedMode) {
    params.set('mode', encodedMode)
  }

  if (sanitized.disabledFeatures) {
    for (const disabledFeature of sanitized.disabledFeatures) {
      params.append('disabledFeatures', disabledFeature)
    }
  }

  // Run sanitization only once per session
  params.set('sanitized', 'true')

  return `/?${params.toString()}`
}

async function sanitizeAndRedirect(searchParams: {
  [key: string]: string | string[] | undefined
}) {
  const sourceChainId = decodeChainQueryParam(searchParams.sourceChain)
  const destinationChainId = decodeChainQueryParam(
    searchParams.destinationChain
  )
  const experiments =
    typeof searchParams.experiments === 'string'
      ? searchParams.experiments
      : undefined
  const token =
    typeof searchParams.token === 'string' ? searchParams.token : undefined
  const tab =
    typeof searchParams.tab === 'string' ? searchParams.tab : undefined
  const mode =
    typeof searchParams.mode === 'string' ? searchParams.mode : undefined
  const disabledFeatures =
    typeof searchParams.disabledFeatures === 'string'
      ? [searchParams.disabledFeatures]
      : searchParams.disabledFeatures

  // If both sourceChain and destinationChain are not present, let the client sync with Metamask
  if (!sourceChainId && !destinationChainId) {
    return
  }

  if (!isProductionEnvironment || isE2eTestingEnvironment) {
    await registerLocalNetwork()
  }

  const sanitizedChainIds = sanitizeQueryParams({
    sourceChainId,
    destinationChainId,
    disableTransfersToNonArbitrumChains: mode === ModeParamEnum.EMBED
  })
  const sanitized = {
    ...sanitizedChainIds,
    experiments: sanitizeExperimentalFeaturesQueryParam(experiments),
    token: sanitizeTokenQueryParam({
      token,
      sourceChainId: sanitizedChainIds.sourceChainId,
      destinationChainId: sanitizedChainIds.destinationChainId
    }),
    tab: sanitizeTabQueryParam(tab),
    disabledFeatures: DisabledFeaturesParam.decode(disabledFeatures),
    mode: mode ? mode : undefined
  }

  // if the sanitized query params are different from the initial values, redirect to the url with sanitized query params
  if (
    sourceChainId !== sanitized.sourceChainId ||
    destinationChainId !== sanitized.destinationChainId ||
    experiments !== sanitized.experiments ||
    token !== sanitized.token ||
    tab !== sanitized.tab ||
    (disabledFeatures?.length || 0) !==
      (sanitized.disabledFeatures?.length || 0) ||
    mode !== sanitized.mode
  ) {
    console.log(`[sanitizeAndRedirect] sanitizing query params`)
    console.log(
      `[sanitizeAndRedirect]     sourceChain=${sourceChainId}&destinationChain=${destinationChainId}&experiments=${experiments}&token=${token}&tab=${tab}&disabledFeatures=${disabledFeatures}&mode=${mode} (before)`
    )
    console.log(
      `[sanitizeAndRedirect]     sourceChain=${sanitized.sourceChainId}&destinationChain=${sanitized.destinationChainId}&experiments=${sanitized.experiments}&token=${sanitized.token}&tab=${sanitized.tab}&disabledFeatures=${sanitized.disabledFeatures}&mode=${sanitized.mode}&sanitized=true (after)`
    )

    redirect(getDestinationWithSanitizedQueryParams(sanitized, searchParams))
  }
}

export default async function HomePage({ searchParams }: Props) {
  /**
   * This code is run on every query param change,
   * we don't want to sanitize every query param change.
   * It should only be executed once per user per session.
   */
  if (searchParams.sanitized !== 'true') {
    addOrbitChainsToArbitrumSDK()
    await sanitizeAndRedirect(searchParams)
  }

  return <BridgeClient />
}
