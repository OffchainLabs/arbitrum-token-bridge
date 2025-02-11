import React, { ComponentType, useEffect, useState } from 'react'
import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next'
import dynamic from 'next/dynamic'
import { decodeString, encodeString } from 'use-query-params'
import { registerCustomArbitrumNetwork } from '@arbitrum/sdk'

import { Loader } from '../components/common/atoms/Loader'
import {
  getCustomChainsFromLocalStorage,
  mapCustomChainToNetworkData,
  registerLocalNetwork
} from '../util/networks'
import { getOrbitChains } from '../util/orbitChainsList'
import { sanitizeQueryParams } from '../hooks/useNetworks'
import {
  decodeChainQueryParam,
  encodeChainQueryParam
} from '../hooks/useArbQueryParams'
import { sanitizeExperimentalFeaturesQueryParam } from '../util'

const App = dynamic(
  () => {
    return new Promise<{ default: ComponentType }>(async resolve => {
      if (
        process.env.NODE_ENV !== 'production' ||
        process.env.NEXT_PUBLIC_IS_E2E_TEST
      ) {
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

function getDestinationWithSanitizedQueryParams(
  sanitized: {
    sourceChainId: number
    destinationChainId: number
    experiments: string | undefined
  },
  query: GetServerSidePropsContext['query']
) {
  const params = new URLSearchParams()

  for (const key in query) {
    // don't copy "sourceChain" and "destinationChain" query params
    if (
      key === 'sourceChain' ||
      key === 'destinationChain' ||
      key === 'experiments'
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

  if (encodedSource) {
    params.set('sourceChain', encodedSource)

    if (encodedDestination) {
      params.set('destinationChain', encodedDestination)
    }
  }

  if (encodedExperiments) {
    params.set('experiments', encodedExperiments)
  }

  return `/?${params.toString()}`
}

function addOrbitChainsToArbitrumSDK(): Promise<void> {
  return new Promise(resolve => {
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

    resolve()
  })
}

export async function getServerSideProps({
  query
}: GetServerSidePropsContext): Promise<
  GetServerSidePropsResult<Record<string, never>>
> {
  const sourceChainId = decodeChainQueryParam(query.sourceChain)
  const destinationChainId = decodeChainQueryParam(query.destinationChain)
  const experiments = decodeString(query.experiments)

  // If both sourceChain and destinationChain are not present, let the client sync with Metamask
  if (!sourceChainId && !destinationChainId) {
    return {
      props: {}
    }
  }

  if (
    process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PUBLIC_IS_E2E_TEST
  ) {
    await registerLocalNetwork()
  }
  // it's necessary to call this before sanitization to make sure all chains are registered
  await addOrbitChainsToArbitrumSDK()

  // sanitize the query params
  const sanitized = {
    ...sanitizeQueryParams({ sourceChainId, destinationChainId }),
    experiments: sanitizeExperimentalFeaturesQueryParam(experiments)
  }

  // if the sanitized query params are different from the initial values, redirect to the url with sanitized query params
  if (
    sourceChainId !== sanitized.sourceChainId ||
    destinationChainId !== sanitized.destinationChainId ||
    experiments !== sanitized.experiments
  ) {
    console.log(`[getServerSideProps] sanitizing query params`)
    console.log(
      `[getServerSideProps]     sourceChain=${sourceChainId}&destinationChain=${destinationChainId}&experiments=${experiments} (before)`
    )
    console.log(
      `[getServerSideProps]     sourceChain=${sanitized.sourceChainId}&destinationChain=${sanitized.destinationChainId}&experiments=${sanitized.experiments} (after)`
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
  const [chainsLoaded, setChainsLoaded] = useState(false)

  useEffect(() => {
    async function loadChains() {
      await addOrbitChainsToArbitrumSDK()
      setChainsLoaded(true)
    }

    loadChains()
  }, [])

  if (!chainsLoaded) {
    return null
  }

  return <App />
}
