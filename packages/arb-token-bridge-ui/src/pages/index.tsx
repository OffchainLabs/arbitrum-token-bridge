import React, { useEffect } from 'react'
import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next'
import dynamic from 'next/dynamic'
import { registerCustomArbitrumNetwork } from '@arbitrum/sdk'

import { Loader } from '../components/common/atoms/Loader'
import {
  getCustomChainsFromLocalStorage,
  mapCustomChainToNetworkData
} from '../util/networks'
import { getOrbitChains } from '../util/orbitChainsList'
import { sanitizeQueryParams } from '../hooks/useNetworks'
import {
  decodeChainQueryParam,
  encodeChainQueryParam
} from '../hooks/useArbQueryParams'

const App = dynamic(() => import('../components/App/App'), {
  ssr: false,
  loading: () => (
    <>
      <div className="h-12 w-full lg:h-16" />
      <div className="fixed inset-0 m-auto h-[44px] w-[44px]">
        <Loader size="large" color="white" />
      </div>
    </>
  )
})

function getDestinationWithSanitizedQueryParams(
  sanitized: {
    sourceChainId: number
    destinationChainId: number
  },
  query: GetServerSidePropsContext['query']
) {
  const params = new URLSearchParams()

  for (const key in query) {
    // don't copy "sourceChain" and "destinationChain" query params
    if (key === 'sourceChain' || key === 'destinationChain') {
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

  if (encodedSource) {
    params.set('sourceChain', encodedSource)

    if (encodedDestination) {
      params.set('destinationChain', encodedDestination)
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

export function getServerSideProps({
  query
}: GetServerSidePropsContext): GetServerSidePropsResult<Record<string, never>> {
  const sourceChainId = decodeChainQueryParam(query.sourceChain)
  const destinationChainId = decodeChainQueryParam(query.destinationChain)

  // If both sourceChain and destinationChain are not present, let the client sync with Metamask
  if (!sourceChainId && !destinationChainId) {
    return {
      props: {}
    }
  }

  // it's necessary to call this before sanitization to make sure all chains are registered
  addOrbitChainsToArbitrumSDK()

  // sanitize the query params
  const sanitized = sanitizeQueryParams({ sourceChainId, destinationChainId })

  // if the sanitized query params are different from the initial values, redirect to the url with sanitized query params
  if (
    sourceChainId !== sanitized.sourceChainId ||
    destinationChainId !== sanitized.destinationChainId
  ) {
    console.log(`[getServerSideProps] sanitizing query params`)
    console.log(
      `[getServerSideProps]     sourceChain=${sourceChainId}&destinationChain=${destinationChainId} (before)`
    )
    console.log(
      `[getServerSideProps]     sourceChain=${sanitized.sourceChainId}&destinationChain=${sanitized.destinationChainId} (after)`
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

function mockErc20RedeemDepositTransaction() {
  return {
    txID: '0x000000000',
    value: '0.001',
    type: 'deposit-l1',
    direction: 'deposit',
    source: 'local_storage_cache',
    parentChainId: 412346,
    childChainId: 333333,
    status: 'pending',
    assetName: 'WETH',
    assetType: 'ERC20',
    sender: '0xDd924501E36eFB66f838Cc53484D6E7246Ce9CE3',
    destination: '0xDd924501E36eFB66f838Cc53484D6E7246Ce9CE3',
    l1NetworkID: '412346',
    l2NetworkID: '333333',
    timestampCreated: Math.floor(Date.now() / 1000).toString()
  }
}

export default function Index() {
  useEffect(() => {
    addOrbitChainsToArbitrumSDK()

    window.localStorage.setItem(
      `arbitrum:bridge:deposits-${'0xDd924501E36eFB66f838Cc53484D6E7246Ce9CE3'.toLowerCase()}`,
      JSON.stringify([mockErc20RedeemDepositTransaction()])
    )
  }, [])

  return <App />
}
