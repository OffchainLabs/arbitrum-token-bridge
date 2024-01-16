// Used to fetch the TPS (Transactions per Second) information for a network

import axios from 'axios'
import { load } from 'cheerio'
import useSWR from 'swr'

import { getExplorerUrl, isNetwork } from '../util/networks'
import { useNetworks } from './useNetworks'
import { useNetworksRelationship } from './useNetworksRelationship'

const emptyData = { tps: null }

const fetchNetworkTPS = async (l2ChainId: number) => {
  // currently we only support TPS information for Arb-one and nova
  // return null for rest of the networks
  const canFetchTPS =
    isNetwork(Number(l2ChainId)).isArbitrumNova ||
    isNetwork(Number(l2ChainId)).isArbitrumOne
  if (!canFetchTPS) return emptyData

  // url from where we'll fetch stats
  const explorerUrl = getExplorerUrl(Number(l2ChainId))

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
  const [networks] = useNetworks()
  const { childChain } = useNetworksRelationship(networks)

  return useSWR(
    ['tps', childChain.id],
    ([, _childChainId]) => fetchNetworkTPS(_childChainId),
    {
      refreshInterval: 30_000,
      shouldRetryOnError: false
    }
  )
}
