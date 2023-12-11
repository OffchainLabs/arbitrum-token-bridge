// Used to fetch the TPS (Transactions per Second) information for a network

import axios from 'axios'
import { load } from 'cheerio'
import useSWR from 'swr'

import { isNetwork } from '../util/networks'
import { useNetworksAndSigners } from './useNetworksAndSigners'
import { getChainByChainId } from '../util/wagmi/setup'

const emptyData = { tps: null }

const fetchNetworkTPS = async (l2ChainId: number) => {
  // currently we only support TPS information for Arb-one and nova
  // return null for rest of the networks
  const canFetchTPS =
    isNetwork(l2ChainId).isArbitrumNova || isNetwork(l2ChainId).isArbitrumOne
  if (!canFetchTPS) return emptyData

  const chain = getChainByChainId(l2ChainId)

  // url from where we'll fetch stats
  const explorerUrl = chain?.blockExplorers?.default.url ?? ''

  // for 403 or CORS blocked errors while scraping external endpoints, we use cors-proxy
  const finalUrl = `https://corsproxy.io/?${encodeURIComponent(explorerUrl)}`
  const response = await axios.get(finalUrl)

  // Get the HTML code of the webpage
  const html = response.data
  const $ = load(html)
  const tpsElement = $(
    'span[title="Transactions per Second - Adjusted for Arbitrum Nitro system txs"]'
  )
  const tps = (tpsElement?.text() || '')
    .trim()
    .replace(/[()]/g, '')
    .split(' ')[0]

  return { tps: isNaN(Number(tps)) ? null : Number(tps) }
}

export const useNetworkTPS = () => {
  const {
    l2: {
      network: { id: l2ChainId }
    }
  } = useNetworksAndSigners()

  return useSWR(
    ['tps', l2ChainId],
    ([, _l2ChainId]) => fetchNetworkTPS(_l2ChainId),
    {
      refreshInterval: 30_000,
      shouldRetryOnError: false
    }
  )
}
