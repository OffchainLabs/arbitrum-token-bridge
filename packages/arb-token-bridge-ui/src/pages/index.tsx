import { registerCustomArbitrumNetwork } from '@arbitrum/sdk'
import { constants } from 'ethers'
import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next'
import dynamic from 'next/dynamic'
import { ComponentType, useEffect, useState } from 'react'
import { decodeString, encodeString } from 'use-query-params'

import { Loader } from '../components/common/atoms/Loader'
import {
  decodeChainQueryParam,
  encodeChainQueryParam,
  TabParamEnum
} from '../hooks/useArbQueryParams'
import { sanitizeQueryParams } from '../hooks/useNetworks'
import { sanitizeExperimentalFeaturesQueryParam } from '../util'
import {
  isE2eTestingEnvironment,
  isProductionEnvironment
} from '../util/CommonUtils'
import {
  getCustomChainsFromLocalStorage,
  mapCustomChainToNetworkData,
  registerLocalNetwork
} from '../util/networks'
import { getOrbitChains, orbitChains } from '../util/orbitChainsList'

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
  destinationChainId
}: {
  token: string | null | undefined
  destinationChainId: number | undefined
}) => {
  const tokenLowercased = token?.toLowerCase()

  if (!tokenLowercased) {
    return undefined
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
      key === 'tab'
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
  const sourceChainId = decodeChainQueryParam(query.sourceChain)
  const destinationChainId = decodeChainQueryParam(query.destinationChain)
  const experiments = decodeString(query.experiments)
  const token = decodeString(query.token)
  const tab = decodeString(query.tab)

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
    destinationChainId
  })
  const sanitized = {
    ...sanitizedChainIds,
    experiments: sanitizeExperimentalFeaturesQueryParam(experiments),
    token: sanitizeTokenQueryParam({
      token,
      destinationChainId: sanitizedChainIds.destinationChainId
    }),
    tab: sanitizeTabQueryParam(tab)
  }

  // if the sanitized query params are different from the initial values, redirect to the url with sanitized query params
  if (
    sourceChainId !== sanitized.sourceChainId ||
    destinationChainId !== sanitized.destinationChainId ||
    experiments !== sanitized.experiments ||
    token !== sanitized.token ||
    tab !== sanitized.tab
  ) {
    console.log(`[getServerSideProps] sanitizing query params`)
    console.log(
      `[getServerSideProps]     sourceChain=${sourceChainId}&destinationChain=${destinationChainId}&experiments=${experiments}&token=${token}&tab=${tab} (before)`
    )
    console.log(
      `[getServerSideProps]     sourceChain=${sanitized.sourceChainId}&destinationChain=${sanitized.destinationChainId}&experiments=${sanitized.experiments}&token=${sanitized.token}&tab=${sanitized.tab} (after)`
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
