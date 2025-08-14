import { ComponentType, useEffect, useState } from 'react'
import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next'
import dynamic from 'next/dynamic'
import { registerCustomArbitrumNetwork } from '@arbitrum/sdk'
import { constants } from 'ethers'

import { Loader } from '../components/common/atoms/Loader'
import {
  getCustomChainsFromLocalStorage,
  mapCustomChainToNetworkData,
  registerLocalNetwork
} from '../util/networks'
import { getOrbitChains, orbitChains } from '../util/orbitChainsList'
import { sanitizeQueryParams } from '../hooks/useNetworks'
import {
  decodeChainQueryParam,
  encodeChainQueryParam,
  TabParamEnum,
  DisabledFeaturesParam,
  ModeParamEnum
} from '../hooks/useArbQueryParams'
import { sanitizeExperimentalFeaturesQueryParam } from '../util'
import {
  isE2eTestingEnvironment,
  isProductionEnvironment
} from '../util/CommonUtils'
import { sanitizeNullSelectedToken } from '../hooks/useSelectedToken'

const App = dynamic(
  () => {
    return new Promise<{ default: ComponentType }>(async resolve => {
      if (!isProductionEnvironment || isE2eTestingEnvironment) {
        await registerLocalNetwork()
      }

      const AppComponent = await import('../components/App/App')
      resolve(AppComponent)
    })
  },
  {
    ssr: false,
    loading: () => (
      <>
        <div className="h-12 w-full lg:h-16" />
        <div className="fixed inset-0 m-auto h-[44px] w-[44px]">
          <Loader size="large" color="white" />
        </div>
      </>
    )
  }
)

export const sanitizeTokenQueryParam = ({
  token,
  sourceChainId,
  destinationChainId
}: {
  token: string | null | undefined
  sourceChainId: number | undefined
  destinationChainId: number | undefined
}) => {
  const tokenLowercased = token?.toLowerCase()

  if (!tokenLowercased) {
    const sanitizedTokenAddress = sanitizeNullSelectedToken({
      sourceChainId,
      destinationChainId,
      erc20ParentAddress: tokenLowercased || null
    })

    if (sanitizedTokenAddress) {
      return sanitizedTokenAddress
    }
  }
  if (!destinationChainId) {
    return tokenLowercased
  }

  const orbitChain = orbitChains[destinationChainId]

  const isOrbitChainWithCustomGasToken =
    typeof orbitChain !== 'undefined' &&
    typeof orbitChain.nativeToken !== 'undefined' &&
    orbitChain.nativeToken !== constants.AddressZero

  // token=eth doesn't need to be set if ETH is the native gas token
  // we strip it for clarity
  if (tokenLowercased === 'eth' && !isOrbitChainWithCustomGasToken) {
    return undefined
  }

  return tokenLowercased
}

export const sanitizeTabQueryParam = (
  tab: string | string[] | null | undefined
): string => {
  const enumEntryNames = Object.keys(TabParamEnum)

  if (typeof tab === 'string' && enumEntryNames.includes(tab.toUpperCase())) {
    return tab.toLowerCase()
  }

  return TabParamEnum.BRIDGE
}

function getDestinationWithSanitizedQueryParams(
  sanitized: {
    sourceChainId: number
    destinationChainId: number
    experiments: string | undefined
    token: string | undefined
    tab: string
    disabledFeatures: string[] | null
    mode: string | undefined
  },
  query: GetServerSidePropsContext['query']
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
  const encodedExperiments = sanitized.experiments
  const encodedToken = sanitized.token
  const encodedTab = sanitized.tab
  const encodedMode = sanitized.mode

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

  return `/?${params.toString()}`
}

function addOrbitChainsToArbitrumSDK() {
  ;[...getOrbitChains(), ...getCustomChainsFromLocalStorage()].forEach(
    chain => {
      try {
        registerCustomArbitrumNetwork(chain)
        mapCustomChainToNetworkData(chain)
      } catch (_) {
        // already added
      }
    }
  )
}

export async function getServerSideProps({
  query
}: GetServerSidePropsContext): Promise<
  GetServerSidePropsResult<Record<string, never>>
> {
  const sourceChainId = decodeChainQueryParam(
    typeof query.sourceChain === 'string' ? query.sourceChain : undefined
  )
  const destinationChainId = decodeChainQueryParam(
    typeof query.destinationChain === 'string'
      ? query.destinationChain
      : undefined
  )
  const experiments =
    typeof query.experiments === 'string' ? query.experiments : undefined
  const token = typeof query.token === 'string' ? query.token : undefined
  const tab = typeof query.tab === 'string' ? query.tab : undefined
  const mode = typeof query.mode === 'string' ? query.mode : undefined

  // Parse disabled features string/array to array
  let disabledFeatures: string[] = []
  if (typeof query.disabledFeatures === 'string') {
    disabledFeatures = [query.disabledFeatures]
  } else if (Array.isArray(query.disabledFeatures)) {
    disabledFeatures = query.disabledFeatures
  }

  // If both sourceChain and destinationChain are not present, let the client sync with Metamask
  if (!sourceChainId && !destinationChainId) {
    return {
      props: {}
    }
  }

  if (!isProductionEnvironment || isE2eTestingEnvironment) {
    await registerLocalNetwork()
  }
  // it's necessary to call this before sanitization to make sure all chains are registered
  addOrbitChainsToArbitrumSDK()

  // sanitize the query params
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
    disabledFeatures: DisabledFeaturesParam.parse(
      DisabledFeaturesParam.serialize(disabledFeatures || [])
    ),
    mode: mode ? mode : undefined
  }

  // if the sanitized query params are different from the initial values, redirect to the url with sanitized query params
  if (
    sourceChainId !== sanitized.sourceChainId ||
    destinationChainId !== sanitized.destinationChainId ||
    experiments !== sanitized.experiments ||
    token !== sanitized.token ||
    tab !== sanitized.tab ||
    (disabledFeatures?.length || 0) !== sanitized.disabledFeatures?.length ||
    mode !== sanitized.mode
  ) {
    console.log(`[getServerSideProps] sanitizing query params`)
    console.log(
      `[getServerSideProps]     sourceChain=${sourceChainId}&destinationChain=${destinationChainId}&experiments=${experiments}&token=${token}&tab=${tab}&disabledFeatures=${disabledFeatures}&mode=${mode} (before)`
    )
    console.log(
      `[getServerSideProps]     sourceChain=${sanitized.sourceChainId}&destinationChain=${sanitized.destinationChainId}&experiments=${sanitized.experiments}&token=${sanitized.token}&tab=${sanitized.tab}&disabledFeatures=${sanitized.disabledFeatures}&mode=${sanitized.mode} (after)`
    )
    return {
      redirect: {
        permanent: false,
        destination: getDestinationWithSanitizedQueryParams(sanitized, query)
      }
    }
  }

  return {
    props: {}
  }
}

export default function Index() {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    addOrbitChainsToArbitrumSDK()
    setLoaded(true)
  }, [])

  if (!loaded) {
    return null
  }

  return <App />
}
